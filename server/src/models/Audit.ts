import { Schema, model, Document } from 'mongoose';
import {
  AUDIT_TYPES, AuditType,
  AUDIT_STATUSES, AuditStatus,
  RISK_RATINGS, RiskRating,
  COMPLIANCE_OUTCOMES, ComplianceOutcome,
} from '../utils/enums';

export interface IAudit extends Document {
  auditNumber: string;
  title: string;
  contract?: Schema.Types.ObjectId;
  vendor?: Schema.Types.ObjectId;
  auditor: Schema.Types.ObjectId;
  auditType: AuditType;
  status: AuditStatus;
  startDate?: Date;
  endDate?: Date;
  riskRating?: RiskRating;
  complianceOutcome: ComplianceOutcome;
  summary?: string;
  recommendations?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditSchema = new Schema<IAudit>(
  {
    auditNumber:       { type: String, required: true, unique: true },
    title:             { type: String, required: true },
    contract:          { type: Schema.Types.ObjectId, ref: 'Contract' },
    vendor:            { type: Schema.Types.ObjectId, ref: 'Vendor' },
    auditor:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    auditType:         { type: String, enum: AUDIT_TYPES, required: true },
    status:            { type: String, enum: AUDIT_STATUSES, default: 'planned' },
    startDate:         { type: Date },
    endDate:           { type: Date },
    riskRating:        { type: String, enum: RISK_RATINGS },
    complianceOutcome: { type: String, enum: COMPLIANCE_OUTCOMES, default: 'pending' },
    summary:           { type: String },
    recommendations:   { type: String },
  },
  { timestamps: true }
);

export const Audit = model<IAudit>('Audit', AuditSchema);
