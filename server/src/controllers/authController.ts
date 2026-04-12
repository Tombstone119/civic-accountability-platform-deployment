import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export const authController = {
  // Register a new user
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, departmentId } = req.body;
      const result = await authService.register(name, email, password, undefined, departmentId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // Login user
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user profile
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user = await authService.getProfile(req.user.userId);
      
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
};
