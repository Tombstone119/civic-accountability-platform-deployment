import { Request, Response, NextFunction } from 'express';
import { vendorService } from '../services/vendorService';
// hello
export const vendorController = {
  /**
   * @route   GET /api/vendors
   * @desc    List vendors with pagination and filters
   * @access  admin | procurement_officer | auditor | viewer
   * @query   page, limit, search, isBlacklisted, isActive, category
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await vendorService.getAll(page, limit, req.query as Record<string, unknown>);

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
   * @route   GET /api/vendors/:id
   * @desc    Get vendor by ID with documents and contract count
   * @access  admin | procurement_officer | auditor | viewer
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await vendorService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: result.vendor,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/vendors
   * @desc    Register a new vendor
   * @access  admin | procurement_officer
   * @body    { name, registrationNo, email, phone?, address?, category? }
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await vendorService.create(req.body);

      res.status(201).json({
        success: true,
        data: vendor,
        message: 'Vendor created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/vendors/:id
   * @desc    Update vendor details (non-blacklist fields)
   * @access  admin | procurement_officer
   * @body    Partial vendor fields (blacklist fields excluded)
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await vendorService.update(req.params.id, req.body);

      res.status(200).json({
        success: true,
        data: vendor,
        message: 'Vendor updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/vendors/:id
   * @desc    Delete vendor (only if no non-draft contracts exist)
   * @access  admin
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await vendorService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Vendor deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/vendors/:id/blacklist
   * @desc    Blacklist a vendor with a mandatory reason
   * @access  admin
   * @body    { reason: string }
   */
  blacklist: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await vendorService.blacklist(
        req.params.id,
        req.body.reason,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        data: vendor,
        message: 'Vendor blacklisted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/vendors/:id/blacklist
   * @desc    Remove a vendor from the blacklist
   * @access  admin
   */
  unblacklist: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await vendorService.unblacklist(req.params.id);

      res.status(200).json({
        success: true,
        data: vendor,
        message: 'Vendor removed from blacklist successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Documents ──────────────────────────────────────────────────────────────

  /**
   * @route   GET /api/vendors/:id/documents
   * @desc    List all compliance documents for a vendor
   * @access  admin | procurement_officer
   */
  getDocuments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documents = await vendorService.getDocuments(req.params.id);

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/vendors/:id/documents
   * @desc    Add a compliance document to a vendor
   * @access  admin | procurement_officer
   * @body    { documentType, documentNo?, issueDate?, expiryDate?, fileUrl? }
   */
  addDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await vendorService.addDocument(req.params.id, req.body);

      res.status(201).json({
        success: true,
        data: doc,
        message: 'Document added successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/vendors/:id/documents/:docId
   * @desc    Update a vendor document (e.g. mark verified, update expiry)
   * @access  admin | procurement_officer
   * @body    Partial document fields
   */
  updateDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, docId } = req.params;

      // If officer is verifying a document, attach their user ID
      const data = { ...req.body };
      if (data.isVerified === true || data.isVerified === 'true') {
        data.verifiedBy = req.user!.userId;
      }

      const doc = await vendorService.updateDocument(id, docId, data);

      res.status(200).json({
        success: true,
        data: doc,
        message: 'Document updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/vendors/:id/documents/:docId
   * @desc    Remove a compliance document
   * @access  admin
   */
  deleteDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await vendorService.deleteDocument(req.params.id, req.params.docId);

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
