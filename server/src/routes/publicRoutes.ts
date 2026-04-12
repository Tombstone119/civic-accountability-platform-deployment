import { Router } from 'express';
import { publicController } from '../controllers/publicController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import {
  publicCommentValidation,
  commentModerationValidation,
  validateRequest,
} from '../middleware/validation';
import { apiRateLimiter, writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── Currency (Third-party: Frankfurter API) ──────────────────────────────────

/**
 * GET /api/public/currencies
 * Returns all currencies supported by the Frankfurter exchange-rate API.
 * Cached for 24 hours. No auth required.
 */
router.get('/currencies', apiRateLimiter, publicController.getCurrencies);

// ─── Transparency Overview (no auth) ──────────────────────────────────────────

/**
 * GET /api/public/overview  — aggregate dashboard data (departments, spending, audits)
 */
router.get('/overview', apiRateLimiter, publicController.getOverview);

// ─── Public Records (no auth) ─────────────────────────────────────────────────

/**
 * GET /api/public/records  — paginated list (?q=&tags=&page=&limit=)
 */
router.get('/records', apiRateLimiter, publicController.getRecords);

/**
 * GET /api/public/records/:id  — single record + approved comments (increments viewCount)
 */
router.get('/records/:id', apiRateLimiter, publicController.getRecordById);

/**
 * GET /api/public/records/:id/convert?to=EUR&from=USD
 * Returns the contract value for a public record converted to a target currency.
 * Uses live exchange rates from the Frankfurter API. No auth required.
 */
router.get('/records/:id/convert', apiRateLimiter, publicController.convertRecord);

/**
 * GET  /api/public/records/:id/comments  — approved comments only
 * POST /api/public/records/:id/comments  — submit citizen comment (no auth, starts pending)
 */
router
  .route('/records/:id/comments')
  .get(apiRateLimiter, publicController.getComments)
  .post(
    writeRateLimiter,
    publicCommentValidation,
    validateRequest,
    publicController.addComment
  );

// ─── Moderation (admin only) ──────────────────────────────────────────────────

/**
 * GET /api/public/comments  — list all comments with filters (admin only)
 */
router.get(
  '/comments',
  apiRateLimiter,
  authMiddleware,
  requireAdmin,
  publicController.getAllComments
);

/**
 * PUT /api/public/comments/:id  — approve / reject / flag a comment (admin only)
 */
router.put(
  '/comments/:id',
  writeRateLimiter,
  authMiddleware,
  requireAdmin,
  commentModerationValidation,
  validateRequest,
  publicController.moderateComment
);

export default router;
