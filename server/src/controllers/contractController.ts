import { Request, Response, NextFunction } from 'express';
import { contractService } from '../services/contractService';

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

export const contractController = {
  /**
   * @route   GET /api/contracts
   * @desc    List contracts with pagination and filters
   * @access  All authenticated roles
   * @query   page, limit, status, department, vendor, procurementMethod, isPublic, search
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = extractPagination(req);

      const result = await contractService.getAll(page, limit, req.query as Record<string, unknown>);
      sendPaginated(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/contracts/:id
   * @desc    Get full contract detail: contract + items + payment count + financials
   * @access  All authenticated roles
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: result.contract,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/contracts
   * @desc    Create a new contract (blacklist-checks vendor automatically)
   * @access  admin | procurement_officer
   * @body    { contractNo, title, vendor, department, contractValue, procurementMethod, startDate, endDate, description?, category?, tags? }
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.create(req.body, req.user!.userId);

      res.status(201).json({
        success: true,
        data: result.contract,
        warnings: result.warnings,
        message: 'Contract created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/contracts/:id
   * @desc    Update contract — toggling isPublic=true auto-creates a PublicRecord
   * @access  admin | procurement_officer
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await contractService.update(req.params.id, req.body, req.user!.userId);

      res.status(200).json({
        success: true,
        data: contract,
        message: 'Contract updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/contracts/:id
   * @desc    Delete contract (draft only — cascades items and payments)
   * @access  admin
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await contractService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Contract deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Publish ────────────────────────────────────────────────────────────────

  /**
   * @route   POST /api/contracts/:id/publish
   * @desc    Publish contract to public portal (sets isPublic=true, creates PublicRecord)
   * @access  admin | procurement_officer
   */
  publish: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.publish(req.params.id, req.user!.userId);

      res.status(200).json({
        success: true,
        data: result.publicRecord,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Contract Items ──────────────────────────────────────────────────────────

  /**
   * @route   GET /api/contracts/:id/items
   * @desc    List all line items for a contract (includes overpricing flag)
   * @access  All authenticated roles
   */
  getItems: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await contractService.getItems(req.params.id);

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/contracts/:id/items
   * @desc    Add a line item to a contract
   * @access  admin | procurement_officer
   * @body    { description, quantity, unitPrice, unit?, marketPrice? }
   */
  addItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.addItem(req.params.id, req.body);

      res.status(201).json({
        success: true,
        data: result.item,
        warnings: result.warnings,
        message: 'Item added successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/contracts/:id/items/:itemId
   * @desc    Update a line item (totalPrice recalculated automatically)
   * @access  admin | procurement_officer
   */
  updateItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.updateItem(
        req.params.id,
        req.params.itemId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: result.item,
        warnings: result.warnings,
        message: 'Item updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/contracts/:id/items/:itemId
   * @desc    Remove a line item
   * @access  admin
   */
  deleteItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await contractService.deleteItem(req.params.id, req.params.itemId);

      res.status(200).json({
        success: true,
        message: 'Item deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Payments sub-resource ───────────────────────────────────────────────────

  /**
   * @route   GET /api/contracts/:id/payments
   * @desc    List paginated payments for a contract
   * @access  admin | procurement_officer
   * @query   page, limit
   */
  getPayments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = extractPagination(req);

      const result = await contractService.getPayments(req.params.id, page, limit);
      sendPaginated(res, result);
    } catch (error) {
      next(error);
    }
  },
};
