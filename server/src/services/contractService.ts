/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { Contract, IContract } from '../models/Contract';
import { ContractItem } from '../models/ContractItem';
import { Payment } from '../models/Payment';
import { PublicRecord } from '../models/PublicRecord';
import { PublicComment } from '../models/PublicComment';
import { Vendor } from '../models/Vendor';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildContractFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};

  if (query.status)            filter.status = query.status;
  if (query.procurementMethod) filter.procurementMethod = query.procurementMethod;
  if (query.department)        filter.department = query.department;
  if (query.vendor)            filter.vendor = query.vendor;
  if (query.isPublic !== undefined) {
    filter.isPublic = query.isPublic === 'true' || query.isPublic === true;
  }
  if (query.search) {
    filter.$text = { $search: String(query.search) };
  }

  return filter;
}

const baseContractPopulate = [
  { path: 'vendor', select: 'name registrationNumber isBlacklisted' },
  { path: 'department', select: 'name code' },
  { path: 'createdBy', select: 'name email' },
] as const;

const applyBaseContractPopulate = (query: any) => {
  let chain = query;
  for (const config of baseContractPopulate) {
    chain = chain.populate(config.path, config.select);
  }
  return chain;
};

/**
 * Overpricing detection: true when unitPrice exceeds marketPrice by more than threshold.
 * Default threshold = 20% above market rate.
 */
export const detectOverpricing = (
  unitPrice: number,
  marketPrice: number | undefined,
  threshold = 0.2
): boolean => {
  if (!marketPrice) return false;
  return unitPrice > marketPrice * (1 + threshold);
};

// ─── Contract CRUD ────────────────────────────────────────────────────────────

export const contractService = {
  /**
   * Paginated contract list.
   * Query filters: status, department, vendor, procurementMethod, isPublic, search
   */
  getAll: async (page = 1, limit = 10, query: Record<string, unknown> = {}) => {
    const { page: sanitizedPage, limit: sanitizedLimit, skip } = getPaginationParams(page, limit);

    const filter = buildContractFilter(query);

    const findQuery = applyBaseContractPopulate(Contract.find(filter as any))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(sanitizedLimit);

    const [data, total] = await Promise.all([
      findQuery,
      Contract.countDocuments(filter as any),
    ]);

    return buildPaginatedResult(data, total, sanitizedPage, sanitizedLimit);
  },

  /**
   * Single contract with full population: vendor, department, createdBy, items, payment summary.
   */
  getById: async (id: string) => {
    const contract = await Contract.findById(id)
      .populate('vendor', 'name registrationNumber email isBlacklisted')
      .populate('department', 'name code')
      .populate('createdBy', 'name email');

    if (!contract) throw new NotFoundError('Contract not found');

    const [items, paymentCount] = await Promise.all([
      ContractItem.find({ contract: id } as any).sort({ createdAt: 1 }),
      Payment.countDocuments({ contract: id } as any),
    ]);

    // Compute financial summary
    const totalItemValue = items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
    const isOverBudget   = contract.totalPaid > contract.contractValue;

    return {
      contract,
      items,
      paymentCount,
      financials: {
        contractValue:  contract.contractValue,
        totalPaid:      contract.totalPaid,
        remaining:      contract.contractValue - contract.totalPaid,
        totalItemValue,
        isOverBudget,
      },
    };
  },

  /**
   * Create contract with:
   *  - vendor blacklist check
   *  - direct_award flag warning in response
   */
  create: async (data: Record<string, any>, userId: string) => {
    const vendor = await Vendor.findById(data.vendor);
    if (!vendor) throw new NotFoundError('Vendor not found');
    if (vendor.isBlacklisted) {
      throw new BadRequestError(`Vendor is blacklisted: ${vendor.blacklistReason}`);
    }

    const { _id, id, createdAt, updatedAt, createdBy, ...safeData } = data;
    void _id; void id; void createdAt; void updatedAt; void createdBy;

    const contract = await Contract.create({ ...safeData, createdBy: userId } as any);

    // Update vendor aggregate counters
    await Vendor.findByIdAndUpdate(data.vendor, {
      $inc: { totalContractsValue: data.contractValue ?? 0 },
    });

    const isDirectAward = data.procurementMethod === 'direct_award';

    return {
      contract,
      warnings: isDirectAward
        ? ['Direct award procurement method requires additional justification documentation.']
        : [],
    };
  },

  /**
   * Update contract fields.
   * - If isPublic flips true  → create PublicRecord
   * - If isPublic flips false → deactivate PublicRecord and cascade-delete its comments
   */
  update: async (id: string, data: Record<string, any>, userId: string) => {
    const existing = await Contract.findById(id);
    if (!existing) throw new NotFoundError('Contract not found');

    // Prevent editing terminated contracts
    if (existing.status === 'terminated') {
      throw new BadRequestError('Terminated contracts cannot be modified');
    }

    // If changing vendor, check blacklist
    if (data.vendor && String(data.vendor) !== String(existing.vendor)) {
      const vendor = await Vendor.findById(data.vendor);
      if (!vendor) throw new NotFoundError('Vendor not found');
      if (vendor.isBlacklisted) {
        throw new BadRequestError(`Vendor is blacklisted: ${vendor.blacklistReason}`);
      }
    }

    const { _id, id: ignoredId, createdAt, updatedAt, createdBy, ...safeData } = data;
    void _id; void ignoredId; void createdAt; void updatedAt; void createdBy;

    const wasPublic = existing.isPublic;
    const willBePublic = safeData.isPublic !== undefined ? safeData.isPublic : wasPublic;

    const contract = await Contract.findByIdAndUpdate(id, safeData as any, {
      new: true,
      runValidators: true,
    })
      .populate('vendor', 'name registrationNumber')
      .populate('department', 'name code')
      .populate('createdBy', 'name email');

    // Handle publish state changes
    if (!wasPublic && willBePublic) {
      await contractService._createPublicRecord(id, userId, existing.title);
    } else if (wasPublic && !willBePublic) {
      await contractService._removePublicRecord(id);
    }

    return contract!;
  },

  /**
   * Delete contract. Only 'draft' contracts can be deleted.
   * Cascades: ContractItems, Payments (should not exist for drafts, but cleaned up defensively).
   */
  delete: async (id: string) => {
    const contract = await Contract.findById(id);
    if (!contract) throw new NotFoundError('Contract not found');

    if (contract.status !== 'draft') {
      throw new ConflictError(
        `Cannot delete contract with status '${contract.status}'. Only draft contracts can be deleted.`
      );
    }

    await Promise.all([
      ContractItem.deleteMany({ contract: id } as any),
      Payment.deleteMany({ contract: id } as any),
    ]);

    await Contract.findByIdAndDelete(id);
  },

  // ─── Publish ────────────────────────────────────────────────────────────────

  /**
   * Explicitly publish a contract to the public portal.
   * Sets isPublic=true and creates a PublicRecord.
   */
  publish: async (contractId: string, userId: string) => {
    const contract = await Contract.findById(contractId);
    if (!contract) throw new NotFoundError('Contract not found');
    if (contract.isPublic) throw new BadRequestError('Contract is already published');

    await Contract.findByIdAndUpdate(contractId, { isPublic: true });
    const record = await contractService._createPublicRecord(contractId, userId, contract.title);

    return { message: 'Contract published successfully', publicRecord: record };
  },

  // ─── Contract Items ──────────────────────────────────────────────────────────

  getItems: async (contractId: string) => {
    const contract = await Contract.findById(contractId);
    if (!contract) throw new NotFoundError('Contract not found');

    const items = await ContractItem.find({ contract: contractId } as any).sort({ createdAt: 1 });

    // Annotate overpricing flag
    const annotated = items.map((item) => {
      const plain = item.toObject() as any;
      plain.isPriceWarning = detectOverpricing(item.unitPrice, item.marketPrice);
      return plain;
    });

    return annotated;
  },

  addItem: async (
    contractId: string,
    data: {
      description: string;
      quantity: number;
      unitPrice: number;
      unit?: string;
      marketPrice?: number;
    }
  ) => {
    const contract = await Contract.findById(contractId);
    if (!contract) throw new NotFoundError('Contract not found');

    if (contract.status === 'terminated' || contract.status === 'completed') {
      throw new BadRequestError(`Cannot add items to a ${contract.status} contract`);
    }

    const totalPrice = data.quantity * data.unitPrice;
    const item = new ContractItem({
      contract: new Types.ObjectId(contractId),
      ...data,
      totalPrice,
    });
    await item.save(); // triggers pre-save hook

    const isPriceWarning = detectOverpricing(data.unitPrice, data.marketPrice);

    return {
      item,
      warnings: isPriceWarning
        ? [`Unit price (${data.unitPrice}) exceeds market price by more than 20%.`]
        : [],
    };
  },

  updateItem: async (
    contractId: string,
    itemId: string,
    data: Partial<{
      description: string;
      quantity: number;
      unitPrice: number;
      unit: string;
      marketPrice: number;
    }>
  ) => {
    const item = await ContractItem.findOne({ _id: itemId, contract: contractId } as any);
    if (!item) throw new NotFoundError('Item not found on this contract');

    // Apply changes onto document and save to trigger pre-save hook (recalculates totalPrice)
    Object.assign(item, data);
    await item.save();

    const isPriceWarning = detectOverpricing(item.unitPrice, item.marketPrice);

    return {
      item,
      warnings: isPriceWarning
        ? [`Unit price (${item.unitPrice}) exceeds market price by more than 20%.`]
        : [],
    };
  },

  deleteItem: async (contractId: string, itemId: string) => {
    const item = await ContractItem.findOne({ _id: itemId, contract: contractId } as any);
    if (!item) throw new NotFoundError('Item not found on this contract');

    await ContractItem.findByIdAndDelete(itemId);
  },

  // ─── Payment Integration ─────────────────────────────────────────────────────

  /**
   * Called by paymentService when a payment is created or status changes.
   * Recalculates totalPaid from completed payments and flags overpayments.
   */
  recalculateTotalPaid: async (contractId: string) => {
    const result = await Payment.aggregate([
      { $match: { contract: new Types.ObjectId(contractId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalPaid = result[0]?.total ?? 0;

    const contract = await Contract.findByIdAndUpdate(
      contractId,
      { totalPaid },
      { new: true }
    );

    if (!contract) throw new NotFoundError('Contract not found');

    const isOverpayment = totalPaid > contract.contractValue;
    return {
      totalPaid,
      contractValue: contract.contractValue,
      isOverpayment,
      overpaymentAmount: isOverpayment ? totalPaid - contract.contractValue : 0,
    };
  },

  /**
   * Returns paginated payments for a contract.
   */
  getPayments: async (contractId: string, page = 1, limit = 10) => {
    const { page: sanitizedPage, limit: sanitizedLimit, skip } = getPaginationParams(page, limit);

    const contract = await Contract.findById(contractId);
    if (!contract) throw new NotFoundError('Contract not found');

    const [data, total] = await Promise.all([
      Payment.find({ contract: contractId } as any)
        .populate('processedBy', 'name email')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(sanitizedLimit),
      Payment.countDocuments({ contract: contractId } as any),
    ]);

    return buildPaginatedResult(data, total, sanitizedPage, sanitizedLimit);
  },

  // ─── Internal helpers ────────────────────────────────────────────────────────

  _createPublicRecord: async (contractId: string, userId: string, title: string) => {
    // Upsert: if already exists (even inactive), reactivate it
    const existing = await PublicRecord.findOne({ contract: contractId } as any);
    if (existing) {
      return PublicRecord.findByIdAndUpdate(
        existing._id,
        { isActive: true, publishedBy: new Types.ObjectId(userId), publishedAt: new Date(), title },
        { new: true }
      );
    }

    return PublicRecord.create({
      contract:    new Types.ObjectId(contractId),
      publishedBy: new Types.ObjectId(userId),
      publishedAt: new Date(),
      title,
      isActive: true,
    } as any);
  },

  _removePublicRecord: async (contractId: string) => {
    const record = await PublicRecord.findOne({ contract: contractId } as any);
    if (!record) return;

    // Cascade-delete comments
    await PublicComment.deleteMany({ publicRecord: record._id } as any);
    await PublicRecord.findByIdAndDelete(record._id);
  },
};
