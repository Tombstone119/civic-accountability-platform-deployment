import { Schema, model, Document } from 'mongoose';

export interface ISpendingSummary extends Document {
  fiscalYear: number;
  department?: Schema.Types.ObjectId;
  totalSpend: number;
  totalContracts: number;
  avgContractValue: number;
  avgRiskScore: number;
  directAwardCount: number;
  overpaymentCount: number;
  lastRefreshed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SpendingSummarySchema = new Schema<ISpendingSummary>(
  {
    fiscalYear:       { type: Number, required: true },
    department:       { type: Schema.Types.ObjectId, ref: 'Department' },
    totalSpend:       { type: Number, default: 0 },
    totalContracts:   { type: Number, default: 0 },
    avgContractValue: { type: Number, default: 0 },
    avgRiskScore:     { type: Number, default: 0 },
    directAwardCount: { type: Number, default: 0 },
    overpaymentCount: { type: Number, default: 0 },
    lastRefreshed:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SpendingSummarySchema.index({ fiscalYear: 1, department: 1 }, { unique: true });

export const SpendingSummary = model<ISpendingSummary>('SpendingSummary', SpendingSummarySchema);
