import { Request, Response, NextFunction } from 'express';
import { spendingService } from '../services/spendingService';

export const spendingController = {
  // Get all spending records
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await spendingService.getAll(page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total:      result.total,
          page:       result.page,
          limit:      result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Get spending record by ID
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const spending = await spendingService.getById(id);
      
      res.status(200).json({
        success: true,
        data: spending,
      });
    } catch (error) {
      next(error);
    }
  },

  // Create a new spending record
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const spending = await spendingService.create(req.body);
      
      res.status(201).json({
        success: true,
        data: spending,
        message: 'Spending record created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // Update a spending record
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const spending = await spendingService.update(id, req.body);
      
      res.status(200).json({
        success: true,
        data: spending,
        message: 'Spending record updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete a spending record
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await spendingService.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Spending record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get spending by department
  getByDepartment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { department } = req.params;
      const spending = await spendingService.getByDepartment(department);
      
      res.status(200).json({
        success: true,
        data: spending,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get spending summary
  getSummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fiscalYear   = req.query.year       ? parseInt(req.query.year as string) : undefined;
      const departmentId = req.query.department as string | undefined;
      const summary = await spendingService.getSummary(fiscalYear, departmentId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/spending/refresh-summary
   * @desc    Re-aggregate live data for a fiscal year and upsert SpendingSummary per department
   * @access  admin
   * @body    { fiscalYear }
   */
  refreshSummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fiscalYear = parseInt(req.body.fiscalYear as string);
      const result = await spendingService.refreshSummary(fiscalYear);

      res.status(200).json({
        success: true,
        data:    result,
        message: `Spending summary refreshed for fiscal year ${fiscalYear}`,
      });
    } catch (error) {
      next(error);
    }
  },
};
