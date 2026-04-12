import { Router } from 'express';
import { spendingController } from '../controllers/spendingController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { spendingValidation, refreshSummaryValidation, validateRequest } from '../middleware/validation';
import { writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/',                         spendingController.getAll);
router.get('/summary',                  spendingController.getSummary);
router.get('/department/:department',   spendingController.getByDepartment);

// ─── Admin: trigger re-aggregation ───────────────────────────────────────────
// Must be registered before /:id so Express does not match "refresh-summary" as an id
/**
 * POST /api/spending/refresh-summary
 * Re-aggregates live contract/payment/audit data and upserts SpendingSummary per dept.
 * Body: { fiscalYear: number }
 */
router.post(
  '/refresh-summary',
  writeRateLimiter,
  authMiddleware,
  requireAdmin,
  refreshSummaryValidation,
  validateRequest,
  spendingController.refreshSummary
);

// ─── CRUD (admin) ─────────────────────────────────────────────────────────────
router.get('/:id',    spendingController.getById);
router.post('/',      writeRateLimiter, authMiddleware, requireAdmin, spendingValidation, validateRequest, spendingController.create);
router.put('/:id',    writeRateLimiter, authMiddleware, requireAdmin, spendingValidation, validateRequest, spendingController.update);
router.delete('/:id', writeRateLimiter, authMiddleware, requireAdmin, spendingController.delete);

export default router;
