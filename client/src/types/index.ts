// ─── Shared API shapes ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'procurement_officer' | 'auditor' | 'viewer';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// ─── Department ───────────────────────────────────────────────────────────────

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  budget: number;
  fiscalYear: number;
  headOfDepartment?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export type VendorStatus = 'active' | 'inactive' | 'blacklisted' | 'under_review';

export interface Vendor {
  _id: string;
  name: string;
  registrationNumber: string;
  email: string;
  phone?: string;
  address?: string;
  status: VendorStatus;
  isBlacklisted: boolean;
  blacklistReason?: string;
  totalContractsValue: number;
  performanceScore?: number;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType =
  | 'tax_clearance'
  | 'business_license'
  | 'registration_certificate'
  | 'insurance'
  | 'other';

export interface VendorDocument {
  _id: string;
  vendor: string | Vendor;
  documentType: DocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  isVerified: boolean;
  fileUrl?: string;
  createdAt: string;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export type ContractStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'terminated'
  | 'under_review';

export type ProcurementMethod =
  | 'open_tender'
  | 'restricted_tender'
  | 'direct_award'
  | 'framework_agreement'
  | 'emergency';

export interface Contract {
  _id: string;
  contractNumber: string;
  title: string;
  description?: string;
  vendor: string | Vendor;
  department: string | Department;
  procurementMethod: ProcurementMethod;
  status: ContractStatus;
  contractValue: number;
  currency: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface ContractItem {
  _id: string;
  contract: string | Contract;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentType = 'advance' | 'milestone' | 'final' | 'installment';

export interface Payment {
  _id: string;
  contract: string | Contract;
  amount: number;
  currency: string;
  paymentDate: string;
  status: PaymentStatus;
  paymentType: PaymentType;
  referenceNumber?: string;
  description?: string;
  processedBy: string | User;
  createdAt: string;
  updatedAt: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditType = 'routine' | 'forensic' | 'compliance' | 'performance';
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type RiskRating = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceOutcome = 'compliant' | 'non_compliant' | 'partially_compliant' | 'pending';

export interface Audit {
  _id: string;
  auditNumber: string;
  title: string;
  contract?: string | Contract;
  vendor?: string | Vendor;
  auditor: string | User;
  auditType: AuditType;
  status: AuditStatus;
  riskRating: RiskRating;
  complianceOutcome: ComplianceOutcome;
  startDate: string;
  endDate?: string;
  summary?: string;
  recommendations?: string;
  createdAt: string;
  updatedAt: string;
}

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';
export type FindingType =
  | 'fraud'
  | 'overpricing'
  | 'delay'
  | 'non_compliance'
  | 'documentation'
  | 'other';

export interface AuditFinding {
  _id: string;
  audit: string | Audit;
  title: string;
  description: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  recommendation?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Public Portal ────────────────────────────────────────────────────────────

export interface PublicRecord {
  _id: string;
  contract: string | Contract;
  title: string;
  description?: string;
  publishedAt: string;
  publishedBy: string | User;
  viewCount: number;
  createdAt: string;
}

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface PublicComment {
  _id: string;
  publicRecord: string | PublicRecord;
  authorName: string;
  authorEmail?: string;
  content: string;
  isAnonymous: boolean;
  isFlagged: boolean;
  status: CommentStatus;
  createdAt: string;
}

export interface SpendingSummary {
  _id: string;
  department: string | Department;
  fiscalYear: number;
  totalSpend: number;
  totalContracts: number;
  avgContractValue?: number;
  avgRiskScore?: number;
  directAwardCount?: number;
  overpaymentCount?: number;
  previousYearSpend?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc';

export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
