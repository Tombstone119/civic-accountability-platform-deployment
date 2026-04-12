import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { userUpdateValidation, validateRequest } from '../middleware/validation';
import { writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/users  — list all users (admin only)
 * @query page, limit, role, isActive, department
 */
router.get('/', authMiddleware, requireAdmin, userController.getAll);

/**
 * GET    /api/users/:id  — get user detail (admin only)
 * PUT    /api/users/:id  — update role / isActive / department (admin only)
 * DELETE /api/users/:id  — delete user (admin only, blocked if linked to contracts)
 */
router
  .route('/:id')
  .get(authMiddleware, requireAdmin, userController.getById)
  .put(
    writeRateLimiter,
    authMiddleware,
    requireAdmin,
    userUpdateValidation,
    validateRequest,
    userController.update
  )
  .delete(writeRateLimiter, authMiddleware, requireAdmin, userController.delete);

export default router;
