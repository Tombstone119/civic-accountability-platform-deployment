import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';

export const userController = {
  /**
   * @route   GET /api/users
   * @desc    List users with pagination and filters
   * @access  admin
   * @query   page, limit, role, isActive, department
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await userService.getAll(page, limit, req.query as Record<string, unknown>);

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

  /**
   * @route   GET /api/users/:id
   * @desc    Get user by ID
   * @access  admin
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/users/:id
   * @desc    Update user role, isActive, or department (admin cannot modify self role/isActive)
   * @access  admin
   * @body    { role?, isActive?, department? }
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.update(req.params.id, req.body, req.user!.userId);

      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/users/:id
   * @desc    Delete user (blocked if linked to contracts — deactivate instead)
   * @access  admin
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await userService.delete(req.params.id, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/auth/profile
   * @desc    Authenticated user updates their own name and/or password
   * @access  All authenticated roles
   * @body    { name?, currentPassword?, newPassword? }
   */
  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateProfile(req.user!.userId, req.body);

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
