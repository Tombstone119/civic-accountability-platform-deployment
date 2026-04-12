import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';

export const auditController = {
  /**
   * @route   GET /api/audits
   * @desc    List audits with pagination and filters
   * @access  admin | auditor
   * @query   page, limit, auditType, status, riskRating, contract, vendor, auditor
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await auditService.getAll(page, limit, req.query as Record<string, unknown>);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total:      result.total,
          page:       result.page,
          limit:      result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/audits/:id
   * @desc    Get audit detail with all findings
   * @access  admin | auditor
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auditService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: result.audit,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/audits
   * @desc    Create a new audit (auditor set from JWT)
   * @access  admin | auditor
   * @body    { auditType, contract?, vendor?, startDate?, endDate?, summary?, recommendations?, findings?[] }
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audit = await auditService.create(req.body, req.user!.userId);

      res.status(201).json({
        success: true,
        data: audit,
        message: 'Audit created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/audits/:id
   * @desc    Update an audit (auditors can only update their own)
   * @access  admin | auditor
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audit = await auditService.update(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        data: audit,
        message: 'Audit updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/audits/:id
   * @desc    Delete an audit and cascade its findings
   * @access  admin
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auditService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Audit deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Findings ────────────────────────────────────────────────────────────────

  /**
   * @route   GET /api/audits/:id/findings
   * @desc    List all findings for an audit
   * @access  admin | auditor
   */
  getFindings: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const findings = await auditService.getFindings(req.params.id);

      res.status(200).json({
        success: true,
        data: findings,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/audits/:id/findings
   * @desc    Add a finding to an audit (triggers risk recalculation)
   * @access  admin | auditor
   * @body    { findingType, severity, description, evidence?, recommendation? }
   */
  addFinding: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auditService.addFinding(req.params.id, req.body);

      res.status(201).json({
        success: true,
        data: result.finding,
        auditRisk: result.auditRisk,
        message: 'Finding added successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/audits/:id/findings/:findingId
   * @desc    Update a finding — setting isResolved=true stamps resolvedBy/resolvedAt
   * @access  admin | auditor
   * @body    { findingType?, severity?, description?, evidence?, recommendation?, isResolved? }
   */
  updateFinding: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auditService.updateFinding(
        req.params.id,
        req.params.findingId,
        req.body,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        data: result.finding,
        auditRisk: result.auditRisk,
        message: 'Finding updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/audits/:id/findings/:findingId
   * @desc    Delete a finding (triggers risk recalculation)
   * @access  admin
   */
  deleteFinding: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auditService.deleteFinding(req.params.id, req.params.findingId);

      res.status(200).json({
        success: true,
        auditRisk: result.auditRisk,
        message: 'Finding deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
