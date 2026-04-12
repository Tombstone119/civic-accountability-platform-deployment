import { Schema, model, Document } from 'mongoose';
import {
  FINDING_TYPES, FindingType,
  FINDING_SEVERITIES, FindingSeverity,
  FINDING_STATUSES, FindingStatus,
} from '../utils/enums';

export interface IAuditFinding extends Document {
  audit: Schema.Types.ObjectId;
  title: string;
  findingType: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  description: string;
  evidence?: string;
  recommendation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditFindingSchema = new Schema<IAuditFinding>(
  {
    audit:          { type: Schema.Types.ObjectId, ref: 'Audit', required: true },
    title:          { type: String, required: true },
    findingType:    { type: String, enum: FINDING_TYPES, required: true },
    severity:       { type: String, enum: FINDING_SEVERITIES, required: true },
    status:         { type: String, enum: FINDING_STATUSES, default: 'open' },
    description:    { type: String, required: true },
    evidence:       { type: String },
    recommendation: { type: String },
  },
  { timestamps: true }
);

export const AuditFinding = model<IAuditFinding>('AuditFinding', AuditFindingSchema);
