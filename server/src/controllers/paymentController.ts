import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';

const extractPagination = (req: Request) => ({
  page: parseInt(req.query.page as string, 10) || 1,
  limit: parseInt(req.query.limit as string, 10) || 10,
});

const sendPaginated = (
  res: Response,
  result: { data: unknown; total: number; page: number; limit: number; totalPages: number }
) => {
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
};

export const paymentController = {
  /**
   * @route   GET /api/payments
   * @desc    List payments with pagination and filters
   * @access  admin | procurement_officer
   * @query   page, limit, contract, vendor, status, isOverpayment
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = extractPagination(req);

      const result = await paymentService.getAll(page, limit, req.query as Record<string, unknown>);
      sendPaginated(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/payments/:id
   * @desc    Get payment by ID with full population
   * @access  admin | procurement_officer
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await paymentService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/payments
   * @desc    Record a new payment against a contract
   * @access  admin | procurement_officer
   * @body    { contract, amount, paymentDate, paymentMethod?, referenceNo?, notes?, status? }
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.create(req.body, req.user!.userId);

      const response: Record<string, unknown> = {
        success: true,
        data:    result.payment,
        message: 'Payment recorded successfully',
      };

      if (result.overpayment?.isOverpayment) {
        response.warning = `Overpayment detected: contract value is ${result.overpayment.contractValue}, ` +
          `total paid is now ${result.overpayment.totalPaid} ` +
          `(exceeds by ${result.overpayment.overpaymentAmount}).`;
      }

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/payments/:id
   * @desc    Update payment status (with transition validation) and/or notes
   * @access  admin
   * @body    { status?, notes?, referenceNo? }
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.update(req.params.id, req.body);

      const response: Record<string, unknown> = {
        success: true,
        data:    result.payment,
        message: 'Payment updated successfully',
      };

      if (result.overpayment?.isOverpayment) {
        response.warning = `Overpayment detected: contract value is ${result.overpayment.contractValue}, ` +
          `total paid is now ${result.overpayment.totalPaid} ` +
          `(exceeds by ${result.overpayment.overpaymentAmount}).`;
      }

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/payments/:id
   * @desc    Delete a payment (blocked if status is completed — use reverse instead)
   * @access  admin
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await paymentService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Payment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
