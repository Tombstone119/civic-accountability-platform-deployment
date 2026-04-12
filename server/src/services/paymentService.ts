/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { Payment } from '../models/Payment';
import { Contract } from '../models/Contract';
import { contractService } from './contractService';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';
import { PaymentStatus, PAYMENT_STATUSES } from '../utils/enums';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';

// ─── Status transition table ──────────────────────────────────────────────────
// Maps each status to the set of statuses it may legally transition to.

const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending:    ['processing', 'completed', 'failed'],
  processing: ['completed', 'failed'],
  completed:  ['reversed'],
  failed:     [],   // terminal
  reversed:   [],   // terminal
};

function assertValidTransition(from: PaymentStatus, to: PaymentStatus) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.length) {
    throw new BadRequestError(`Payment status '${from}' is terminal and cannot be changed`);
  }
  if (!allowed.includes(to)) {
    throw new BadRequestError(
      `Invalid status transition: '${from}' → '${to}'. Allowed: ${allowed.join(', ')}`
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPaymentFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (query.contract) filter.contract = query.contract;
  if (query.vendor)   filter.vendor   = query.vendor;
  if (query.status)   filter.status   = query.status;
  if (query.isOverpayment !== undefined) {
    filter.isOverpayment = query.isOverpayment === 'true' || query.isOverpayment === true;
  }
  return filter;
}

// ─── Payment Service ──────────────────────────────────────────────────────────

export const paymentService = {
  /**
   * Paginated payment list.
   * Filters: contract, vendor, status, isOverpayment
   */
  getAll: async (page = 1, limit = 10, query: Record<string, unknown> = {}) => {
    const { page: sanitizedPage, limit: sanitizedLimit, skip } = getPaginationParams(page, limit);

    const filter = buildPaymentFilter(query);

    const [data, total] = await Promise.all([
      Payment.find(filter as any)
        .populate('contract', 'contractNumber title contractValue totalPaid')
        .populate('vendor', 'name registrationNumber')
        .populate('processedBy', 'name email')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(sanitizedLimit),
      Payment.countDocuments(filter as any),
    ]);

    return buildPaginatedResult(data, total, sanitizedPage, sanitizedLimit);
  },

  /** Single payment with full population. */
  getById: async (id: string) => {
    const payment = await Payment.findById(id)
      .populate('contract', 'contractNumber title contractValue totalPaid status')
      .populate('vendor', 'name registrationNumber')
      .populate('processedBy', 'name email');

    if (!payment) throw new NotFoundError('Payment not found');
    return payment;
  },

  /**
   * Create a payment.
   *
   * Business rules enforced:
   *   - Contract must exist and not be terminated/completed
   *   - Vendor is auto-derived from the contract (no mismatch possible)
   *   - referenceNumber uniqueness is enforced by the schema index
   *   - If initial status is 'completed', totalPaid is recalculated immediately
   *   - isOverpayment flag is set when totalPaid would exceed contractValue
   */
  create: async (data: Record<string, any>, userId: string) => {
    const contract = await Contract.findById(data.contract)
      .populate('vendor', '_id');

    if (!contract) throw new NotFoundError('Contract not found');

    if (contract.status === 'terminated') {
      throw new BadRequestError('Cannot record payment on a terminated contract');
    }
    if (contract.status === 'draft') {
      throw new BadRequestError('Cannot record payment on a draft contract');
    }

    // Derive vendor from contract — prevents data inconsistency
    const vendorId = (contract.vendor as any)._id ?? contract.vendor;

    const initialStatus: PaymentStatus = PAYMENT_STATUSES.includes(data.status)
      ? data.status as PaymentStatus
      : 'pending';

    const payment = await Payment.create({
      contract:        new Types.ObjectId(data.contract),
      vendor:          vendorId,
      amount:          data.amount,
      currency:        data.currency ?? 'USD',
      paymentDate:     data.paymentDate,
      paymentType:     data.paymentType,
      referenceNumber: data.referenceNumber || undefined,
      description:     data.description,
      status:          initialStatus,
      processedBy:     new Types.ObjectId(userId),
      notes:           data.notes,
      isOverpayment:   false,   // computed below if status is already completed
    } as any);

    let overpaymentInfo = null;

    // If created directly as completed, recalculate contract totals right away
    if (initialStatus === 'completed') {
      overpaymentInfo = await contractService.recalculateTotalPaid(String(data.contract));
      if (overpaymentInfo.isOverpayment) {
        await Payment.findByIdAndUpdate(payment._id, { isOverpayment: true });
      }
    }

    const populated = await Payment.findById(payment._id)
      .populate('contract', 'contractNumber title contractValue totalPaid')
      .populate('vendor', 'name registrationNumber')
      .populate('processedBy', 'name email');

    return {
      payment: populated!,
      overpayment: overpaymentInfo,
    };
  },

  /**
   * Update payment status (and optionally notes/referenceNumber).
   *
   * Business rules:
   *   - Status transitions validated against ALLOWED_TRANSITIONS table
   *   - On → 'completed': contract.totalPaid recalculated; isOverpayment set
   *   - On → 'reversed':  contract.totalPaid recalculated (payment excluded)
   *   - On → 'failed':    no effect on totalPaid (was pending/processing)
   */
  update: async (id: string, data: Record<string, any>) => {
    const payment = await Payment.findById(id);
    if (!payment) throw new NotFoundError('Payment not found');

    const updateFields: Record<string, any> = {};

    // Status change
    if (data.status && data.status !== payment.status) {
      assertValidTransition(payment.status, data.status as PaymentStatus);
      updateFields.status = data.status;
    }

    if (data.notes           !== undefined) updateFields.notes           = data.notes;
    if (data.referenceNumber !== undefined) updateFields.referenceNumber = data.referenceNumber;

    if (Object.keys(updateFields).length === 0) {
      throw new BadRequestError('No updatable fields provided');
    }

    await Payment.findByIdAndUpdate(id, updateFields, { runValidators: true });

    let overpaymentInfo = null;
    const newStatus = (updateFields.status ?? payment.status) as PaymentStatus;

    // Recalculate contract totals whenever the set of completed payments changes
    if (newStatus === 'completed' || newStatus === 'reversed') {
      overpaymentInfo = await contractService.recalculateTotalPaid(String(payment.contract));

      // Update isOverpayment flag on this payment
      const isOverpayment = newStatus === 'completed' && (overpaymentInfo?.isOverpayment ?? false);
      await Payment.findByIdAndUpdate(id, { isOverpayment });
    }

    const updated = await Payment.findById(id)
      .populate('contract', 'contractNumber title contractValue totalPaid')
      .populate('vendor', 'name registrationNumber')
      .populate('processedBy', 'name email');

    return {
      payment: updated!,
      overpayment: overpaymentInfo,
    };
  },

  /**
   * Delete a payment.
   * If payment was completed, recalculates contract.totalPaid after removal.
   */
  delete: async (id: string) => {
    const payment = await Payment.findById(id);
    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.status === 'completed') {
      throw new ConflictError(
        'Completed payments cannot be deleted. Reverse the payment instead.'
      );
    }

    const contractId = String(payment.contract);
    await Payment.findByIdAndDelete(id);

    // Re-sync totalPaid in case a processing payment is removed
    await contractService.recalculateTotalPaid(contractId);
  },
};
