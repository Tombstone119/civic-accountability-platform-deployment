import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../utils/enums';

/**
 * Factory that returns a middleware allowing only the specified roles.
 * Must be used after authMiddleware (which attaches req.user).
 *
 * Usage:
 *   router.post('/', authMiddleware, requireRole('admin', 'procurement_officer'), handler)
 */
export const requireRole = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };

// ─── Convenience aliases ────────────────────────────────────────────────────

/** Admin only */
export const requireAdmin = requireRole('admin');

/** Admin or procurement officer — contract/vendor/payment writes */
export const requireOfficer = requireRole('admin', 'procurement_officer');

/** Admin or auditor — audit reads and writes */
export const requireAuditor = requireRole('admin', 'auditor');

/** Auditor only (no admin bypass) — used where strict auditor isolation is needed */
export const requireAuditorOnly = requireRole('auditor');

/** All authenticated roles can reach this — use for read-only routes that still need auth */
export const requireAuthenticated = requireRole('admin', 'procurement_officer', 'auditor', 'viewer');
