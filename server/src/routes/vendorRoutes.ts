import { Router } from 'express';
import { vendorController } from '../controllers/vendorController';
import { authMiddleware, requireAdmin, requireOfficer, requireAuthenticated } from '../middleware/authMiddleware';
import { 
  vendorValidation, 
  vendorUpdateValidation, 
  blacklistValidation, 
  vendorDocumentValidation, 
  vendorDocumentUpdateValidation, 
  validateRequest 
} from '../middleware/validation';

const router = Router();

// ─── Vendor CRUD ──────────────────────────────────────────────────────────────
/**
 * GET  /api/vendors          — list vendors (all authenticated roles)
 * POST /api/vendors          — create vendor (officer+)
 */
router
  .route('/')
  .get(authMiddleware, requireAuthenticated, vendorController.getAll)
  .post(authMiddleware, requireOfficer, vendorValidation, validateRequest, vendorController.create);

/**
 * GET    /api/vendors/:id    — get single vendor (all authenticated roles)
 * PUT    /api/vendors/:id    — update vendor (officer+)
 * DELETE /api/vendors/:id    — delete vendor (officer+)
 */
router
  .route('/:id')
  .get(authMiddleware, requireAuthenticated, vendorController.getById)
  .put(authMiddleware, requireOfficer, vendorUpdateValidation, validateRequest, vendorController.update)
  .delete(authMiddleware, requireOfficer, vendorController.delete);

// ─── Blacklist ────────────────────────────────────────────────────────────────
/**
 * POST   /api/vendors/:id/blacklist   — blacklist vendor (admin only)
 * DELETE /api/vendors/:id/blacklist   — remove from blacklist (admin only)
 */
router
  .route('/:id/blacklist')
  .post(authMiddleware, requireAdmin, blacklistValidation, validateRequest, vendorController.blacklist)
  .delete(authMiddleware, requireAdmin, vendorController.unblacklist);

// ─── Documents ────────────────────────────────────────────────────────────────
/**
 * GET  /api/vendors/:id/documents         — list vendor documents (officer+)
 * POST /api/vendors/:id/documents         — add document (officer+)
 */
router
  .route('/:id/documents')
  .get(authMiddleware, requireOfficer, vendorController.getDocuments)
  .post(authMiddleware, requireOfficer, vendorDocumentValidation, validateRequest, vendorController.addDocument);

/**
 * PUT    /api/vendors/:id/documents/:docId  — update document (officer+)
 * DELETE /api/vendors/:id/documents/:docId  — delete document (admin only)
 */
router
  .route('/:id/documents/:docId')
  .put(authMiddleware, requireOfficer, vendorDocumentUpdateValidation, validateRequest, vendorController.updateDocument)
  .delete(authMiddleware, requireAdmin, vendorController.deleteDocument);

export default router;