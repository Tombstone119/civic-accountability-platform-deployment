import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authMiddleware, requireAdmin, requireOfficer, requireAuthenticated } from '../middleware/authMiddleware';
import { paymentValidation, paymentUpdateValidation, validateRequest } from '../middleware/validation';
import { writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET  /api/payments  — list payments (all authenticated)
 * POST /api/payments  — record a new payment (officer+)
 */
router
  .route('/')
  .get(authMiddleware, requireAuthenticated, paymentController.getAll)
  .post(
    writeRateLimiter,
    authMiddleware,
    requireOfficer,
    paymentValidation,
    validateRequest,
    paymentController.create
  );

/**
 * GET    /api/payments/:id  — get payment detail (all authenticated)
 * PUT    /api/payments/:id  — update status / notes (admin only)
 * DELETE /api/payments/:id  — delete payment (admin only, blocked if completed)
 */
router
  .route('/:id')
  .get(authMiddleware, requireAuthenticated, paymentController.getById)
  .put(
    writeRateLimiter,
    authMiddleware,
    requireAdmin,
    paymentUpdateValidation,
    validateRequest,
    paymentController.update
  )
  .delete(writeRateLimiter, authMiddleware, requireAdmin, paymentController.delete);

export default router;
