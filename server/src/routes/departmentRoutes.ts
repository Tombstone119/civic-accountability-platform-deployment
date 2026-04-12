import { Router } from 'express';
import { departmentController } from '../controllers/departmentController';
import { authMiddleware, requireAdmin, requireAuthenticated } from '../middleware/authMiddleware';
import { departmentValidation, departmentUpdateValidation, validateRequest } from '../middleware/validation';
import { writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET  /api/departments  — list active departments (all authenticated roles)
 * POST /api/departments  — create department (admin only)
 */
router
  .route('/')
  .get(authMiddleware, requireAuthenticated, departmentController.getAll)
  .post(
    writeRateLimiter,
    authMiddleware,
    requireAdmin,
    departmentValidation,
    validateRequest,
    departmentController.create
  );

/**
 * GET    /api/departments/:id  — department detail with counts (all authenticated roles)
 * PUT    /api/departments/:id  — update department (admin only)
 * DELETE /api/departments/:id  — delete department (admin only, blocked if contracts exist)
 */
router
  .route('/:id')
  .get(authMiddleware, requireAuthenticated, departmentController.getById)
  .put(
    writeRateLimiter,
    authMiddleware,
    requireAdmin,
    departmentUpdateValidation,
    validateRequest,
    departmentController.update
  )
  .delete(writeRateLimiter, authMiddleware, requireAdmin, departmentController.delete);

export default router;
