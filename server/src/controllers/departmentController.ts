import { Request, Response, NextFunction } from 'express';
import { departmentService } from '../services/departmentService';

export const departmentController = {
  /**
   * @route   GET /api/departments
   * @desc    List all active departments
   * @access  All authenticated roles
   * @query   search, includeInactive
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departments = await departmentService.getAll(req.query as Record<string, unknown>);

      res.status(200).json({
        success: true,
        data: departments,
        pagination: {
          total:      departments.length,
          page:       1,
          limit:      departments.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/departments/:id
   * @desc    Get department by ID with contract and user counts
   * @access  All authenticated roles
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await departmentService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/departments
   * @desc    Create a new department
   * @access  admin
   * @body    { name, code, budget?, description?, headOfDept? }
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await departmentService.create(req.body);

      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/departments/:id
   * @desc    Update department details
   * @access  admin
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await departmentService.update(req.params.id, req.body);

      res.status(200).json({
        success: true,
        data: department,
        message: 'Department updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/departments/:id
   * @desc    Delete department (blocked if contracts exist)
   * @access  admin
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await departmentService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
