import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authMiddleware, requireAdmin, requireAuditor, requireAuthenticated } from '../middleware/authMiddleware';
import {
  auditValidation,
  auditUpdateValidation,
  auditFindingValidation,
  auditFindingUpdateValidation,
  validateRequest,
} from '../middleware/validation';
import { writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── Audit CRUD ───────────────────────────────────────────────────────────────

/**
 * GET  /api/audits  — list audits (admin | auditor)
 * POST /api/audits  — create audit (admin | auditor)
 */
router
  .route('/')
  .get(authMiddleware, requireAuthenticated, auditController.getAll)
  .post(
    writeRateLimiter,
    authMiddleware,
    requireAuditor,
    auditValidation,
    validateRequest,
    auditController.create
  );

/**
 * GET    /api/audits/:id  — detail with findings (admin | auditor)
 * PUT    /api/audits/:id  — update (admin | auditor — auditors own only)
 * DELETE /api/audits/:id  — delete + cascade findings (admin only)
 */
router
  .route('/:id')
  .get(authMiddleware, requireAuthenticated, auditController.getById)
  .put(
    writeRateLimiter,
    authMiddleware,
    requireAuditor,
    auditUpdateValidation,
    validateRequest,
    auditController.update
  )
  .delete(writeRateLimiter, authMiddleware, requireAdmin, auditController.delete);

// ─── Findings ─────────────────────────────────────────────────────────────────

/**
 * GET  /api/audits/:id/findings  — list findings (admin | auditor)
 * POST /api/audits/:id/findings  — add finding, triggers risk recalc (admin | auditor)
 */
router
  .route('/:id/findings')
  .get(authMiddleware, requireAuthenticated, auditController.getFindings)
  .post(
    writeRateLimiter,
    authMiddleware,
    requireAuditor,
    auditFindingValidation,
    validateRequest,
    auditController.addFinding
  );

/**
 * PUT    /api/audits/:id/findings/:findingId  — update finding (admin | auditor)
 * DELETE /api/audits/:id/findings/:findingId  — delete finding (admin only)
 */
router
  .route('/:id/findings/:findingId')
  .put(
    writeRateLimiter,
    authMiddleware,
    requireAuditor,
    auditFindingUpdateValidation,
    validateRequest,
    auditController.updateFinding
  )
  .delete(writeRateLimiter, authMiddleware, requireAuditor, auditController.deleteFinding);

export default router;
