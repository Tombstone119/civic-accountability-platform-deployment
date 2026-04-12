export const USER_ROLES = ['admin', 'procurement_officer', 'auditor', 'viewer','officer'] as const;
export type UserRole = typeof USER_ROLES[number];

export const CONTRACT_STATUSES = ['draft', 'active', 'completed', 'terminated', 'under_review'] as const;
export type ContractStatus = typeof CONTRACT_STATUSES[number];

export const PROCUREMENT_METHODS = ['open_tender', 'restricted_tender', 'direct_award', 'framework_agreement', 'emergency'] as const;
export type ProcurementMethod = typeof PROCUREMENT_METHODS[number];

export const AUDIT_TYPES = ['routine', 'forensic', 'compliance', 'performance'] as const;
export type AuditType = typeof AUDIT_TYPES[number];

export const AUDIT_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export type AuditStatus = typeof AUDIT_STATUSES[number];

export const FINDING_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type FindingSeverity = typeof FINDING_SEVERITIES[number];

export const FINDING_TYPES = ['fraud', 'overpricing', 'delay', 'non_compliance', 'documentation', 'other'] as const;
export type FindingType = typeof FINDING_TYPES[number];

export const FINDING_STATUSES = ['open', 'in_progress', 'resolved', 'dismissed'] as const;
export type FindingStatus = typeof FINDING_STATUSES[number];

export const COMPLIANCE_OUTCOMES = ['compliant', 'non_compliant', 'partially_compliant', 'pending'] as const;
export type ComplianceOutcome = typeof COMPLIANCE_OUTCOMES[number];

export const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'reversed'] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const RISK_RATINGS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskRating = typeof RISK_RATINGS[number];
