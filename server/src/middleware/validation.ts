import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { CONTRACT_STATUSES, PROCUREMENT_METHODS } from '../utils/enums';

// ─── Generic Request Validation ──────────────────────────────────────────────
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// ─── Auth Validations ────────────────────────────────────────────────────────
export const loginValidation = [
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest,
];

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('departmentId').optional().isMongoId().withMessage('departmentId must be a valid ID'),
  validateRequest,
];

// ─── Contract Validations ────────────────────────────────────────────────────
export const contractValidation = [
  body('contractNumber').trim().notEmpty().withMessage('Contract number is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('vendor').isMongoId().withMessage('Vendor must be a valid ID'),
  body('department').isMongoId().withMessage('Department must be a valid ID'),
  body('contractValue').isNumeric().withMessage('Contract value must be a number'),
  body('currency').optional().trim(),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('procurementMethod').isIn([...PROCUREMENT_METHODS]).withMessage('Invalid procurement method'),
  body('status').optional().isIn([...CONTRACT_STATUSES]).withMessage('Invalid status'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('category').optional().trim(),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  validateRequest,
];

export const contractUpdateValidation = [
  body('contractNumber').optional().trim().notEmpty().withMessage('Contract number cannot be empty'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('vendor').optional().isMongoId().withMessage('Vendor must be a valid ID'),
  body('department').optional().isMongoId().withMessage('Department must be a valid ID'),
  body('contractValue').optional().isNumeric().withMessage('Contract value must be a number'),
  body('currency').optional().trim(),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  body('procurementMethod').optional().isIn([...PROCUREMENT_METHODS]).withMessage('Invalid procurement method'),
  body('status').optional().isIn([...CONTRACT_STATUSES]).withMessage('Invalid status'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('category').optional().trim(),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  validateRequest,
];

export const contractItemValidation = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('unit').optional().trim(),
  body('marketPrice').optional().isFloat({ min: 0 }).withMessage('Market price must be a non-negative number'),
];

export const contractItemUpdateValidation = [
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('unit').optional().trim(),
  body('marketPrice').optional().isFloat({ min: 0 }).withMessage('Market price must be a non-negative number'),
];

// ─── Vendor Validations ──────────────────────────────────────────────────────
export const vendorValidation = [
  body('name').trim().notEmpty().withMessage('Vendor name is required').isLength({ max: 200 }).withMessage('Name too long'),
  body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('category').optional().trim(),
];

export const vendorUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 200 }),
  body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('category').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'blacklisted', 'under_review']).withMessage('Invalid vendor status'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('performanceScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Performance score must be 0–100'),
];

export const blacklistValidation = [
  body('reason').trim().notEmpty().withMessage('Blacklist reason is required'),
];

export const vendorDocumentValidation = [
  body('documentType').trim().notEmpty().withMessage('Document type is required'),
  body('documentNumber').optional().trim(),
  body('issueDate').optional().isISO8601().withMessage('Issue date must be a valid date'),
  body('expiryDate').optional().isISO8601().withMessage('Expiry date must be a valid date'),
  body('fileUrl').optional().trim(),
];

export const vendorDocumentUpdateValidation = [
  body('documentType').optional().trim().notEmpty().withMessage('Document type cannot be empty'),
  body('documentNumber').optional().trim(),
  body('issueDate').optional().isISO8601().withMessage('Issue date must be a valid date'),
  body('expiryDate').optional().isISO8601().withMessage('Expiry date must be a valid date'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean'),
  body('fileUrl').optional().trim(),
];

// ─── Payment Validations ─────────────────────────────────────────────────────
export const paymentValidation = [
  body('contract').isMongoId().withMessage('Contract must be a valid ID'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').optional().trim(),
  body('paymentDate').isISO8601().withMessage('Payment date must be a valid date'),
  body('paymentType').optional().isIn(['advance', 'milestone', 'final', 'installment']).withMessage('Invalid payment type'),
  body('referenceNumber').optional().trim(),
  body('description').optional().trim(),
  body('notes').optional().trim(),
  body('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'reversed']).withMessage('Invalid payment status'),
];

export const paymentUpdateValidation = [
  body('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'reversed']).withMessage('Invalid payment status'),
  body('notes').optional().trim(),
  body('referenceNumber').optional().trim(),
];

// ─── Audit Validations ───────────────────────────────────────────────────────
export const auditValidation = [
  body('auditNumber').optional().trim(),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('auditType').isIn(['routine', 'forensic', 'compliance', 'performance']).withMessage('Invalid audit type'),
  body('contract').optional().isMongoId().withMessage('Contract must be a valid ID'),
  body('vendor').optional().isMongoId().withMessage('Vendor must be a valid ID'),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  body('summary').optional().trim(),
  body('recommendations').optional().trim(),
  body('findings').optional().isArray().withMessage('Findings must be an array'),
];

export const auditUpdateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('auditType').optional().isIn(['routine', 'forensic', 'compliance', 'performance']).withMessage('Invalid audit type'),
  body('status').optional().isIn(['planned', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid audit status'),
  body('riskRating').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid risk rating'),
  body('complianceOutcome').optional().isIn(['compliant', 'non_compliant', 'partially_compliant', 'pending']).withMessage('Invalid compliance outcome'),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  body('summary').optional().trim(),
  body('recommendations').optional().trim(),
];

export const auditFindingValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('findingType').isIn(['fraud', 'overpricing', 'delay', 'non_compliance', 'documentation', 'other']).withMessage('Invalid finding type'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('status').optional().isIn(['open', 'in_progress', 'resolved', 'dismissed']).withMessage('Invalid finding status'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('evidence').optional().trim(),
  body('recommendation').optional().trim(),
];

export const auditFindingUpdateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('findingType').optional().isIn(['fraud', 'overpricing', 'delay', 'non_compliance', 'documentation', 'other']).withMessage('Invalid finding type'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('status').optional().isIn(['open', 'in_progress', 'resolved', 'dismissed']).withMessage('Invalid finding status'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('evidence').optional().trim(),
  body('recommendation').optional().trim(),
];

// ─── Department Validations ──────────────────────────────────────────────────
export const departmentValidation = [
  body('name').trim().notEmpty().withMessage('Department name is required').isLength({ max: 200 }),
  body('code').trim().notEmpty().withMessage('Department code is required').isLength({ max: 20 }),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
  body('fiscalYear').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid fiscal year'),
  body('description').optional().trim(),
  body('headOfDepartment').optional().trim(),
];

export const departmentUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 200 }),
  body('code').optional().trim().notEmpty().withMessage('Code cannot be empty').isLength({ max: 20 }),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
  body('fiscalYear').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid fiscal year'),
  body('description').optional().trim(),
  body('headOfDepartment').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// ─── User Management Validations ────────────────────────────────────────────
export const userUpdateValidation = [
  body('role').optional().isIn(['admin', 'procurement_officer', 'auditor', 'viewer']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('department').optional().isMongoId().withMessage('Department must be a valid ID'),
];

export const profileUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('currentPassword').optional().isString(),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// ─── Spending Validations ───────────────────────────────────────────────────
export const spendingValidation = [
  body('department').isMongoId().withMessage('Department must be a valid ID'),
  body('fiscalYear').isInt({ min: 2000, max: 2100 }).withMessage('Invalid fiscal year'),
  body('totalSpend').optional().isNumeric().withMessage('Total spend must be a number'),
  body('totalContracts').optional().isInt({ min: 0 }).withMessage('Total contracts must be a non-negative integer'),
  validateRequest,
];

export const refreshSummaryValidation = [
  body('fiscalYear').isInt({ min: 2000, max: 2100 }).withMessage('fiscalYear must be a valid year between 2000 and 2100'),
];

// ─── Public Portal Validations ─────────────────────────────────────────────
export const publicCommentValidation = [
  body('authorName').trim().isLength({ min: 2, max: 100 }).withMessage('Author name must be between 2 and 100 characters'),
  body('content').trim().isLength({ min: 10, max: 2000 }).withMessage('Content must be between 10 and 2000 characters'),
  body('authorEmail').optional().isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('isAnonymous').optional().isBoolean().withMessage('isAnonymous must be a boolean'),
  body('isWhistleblower').optional().isBoolean().withMessage('isWhistleblower must be a boolean'),
];

export const commentModerationValidation = [
  body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Status must be pending, approved, or rejected'),
  body('isFlagged').optional().isBoolean().withMessage('isFlagged must be a boolean'),
  body('flagReason').optional().trim(),
];
