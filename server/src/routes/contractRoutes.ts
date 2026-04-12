import { Router } from 'express';
import { contractController } from '../controllers/contractController';
import { authMiddleware, requireAdmin, requireOfficer, requireAuthenticated } from '../middleware/authMiddleware';
import {
  contractValidation,
  contractUpdateValidation,
  contractItemValidation,
  contractItemUpdateValidation,
  validateRequest,
} from '../middleware/validation';
import { writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── Contract CRUD ────────────────────────────────────────────────────────────

/**
 * GET  /api/contracts   — list (all authenticated roles)
 * POST /api/contracts   — create (officer+)
 */
router
  .route('/')
  .get(authMiddleware, requireAuthenticated, contractController.getAll)
  .post(
    writeRateLimiter,
    authMiddleware,
    requireOfficer,
    contractValidation,
    validateRequest,
    contractController.create
  );

/**
 * GET    /api/contracts/:id  — detail (all authenticated roles)
 * PUT    /api/contracts/:id  — update (officer+)
 * DELETE /api/contracts/:id  — delete draft only (admin)
 */
router
  .route('/:id')
  .get(authMiddleware, requireAuthenticated, contractController.getById)
  .put(
    writeRateLimiter,
    authMiddleware,
    requireOfficer,
    contractUpdateValidation,
    validateRequest,
    contractController.update
  )
  .delete(writeRateLimiter, authMiddleware, requireAdmin, contractController.delete);

// ─── Publish ──────────────────────────────────────────────────────────────────

/**
 * POST /api/contracts/:id/publish  — publish to public portal (officer+)
 */
router.post(
  '/:id/publish',
  writeRateLimiter,
  authMiddleware,
  requireOfficer,
  contractController.publish
);

// ─── Contract Items ───────────────────────────────────────────────────────────

/**
 * GET  /api/contracts/:id/items  — list items (all authenticated roles)
 * POST /api/contracts/:id/items  — add item (officer+)
 */
router
  .route('/:id/items')
  .get(authMiddleware, requireAuthenticated, contractController.getItems)
  .post(
    writeRateLimiter,
    authMiddleware,
    requireOfficer,
    contractItemValidation,
    validateRequest,
    contractController.addItem
  );

/**
 * PUT    /api/contracts/:id/items/:itemId  — update item (officer+)
 * DELETE /api/contracts/:id/items/:itemId  — delete item (admin)
 */
router
  .route('/:id/items/:itemId')
  .put(
    writeRateLimiter,
    authMiddleware,
    requireOfficer,
    contractItemUpdateValidation,
    validateRequest,
    contractController.updateItem
  )
  .delete(writeRateLimiter, authMiddleware, requireAdmin, contractController.deleteItem);

// ─── Payments sub-resource ────────────────────────────────────────────────────

/**
 * GET /api/contracts/:id/payments  — list payments (officer+)
 */
router.get(
  '/:id/payments',
  authMiddleware,
  requireOfficer,
  contractController.getPayments
);

export default router;
