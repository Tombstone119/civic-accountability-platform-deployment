import { Schema, model, Document } from 'mongoose';
import { CONTRACT_STATUSES, ContractStatus, PROCUREMENT_METHODS, ProcurementMethod } from '../utils/enums';

export interface IContract extends Document {
  contractNumber: string;
  title: string;
  description?: string;
  vendor: Schema.Types.ObjectId;
  department: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  contractValue: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  procurementMethod: ProcurementMethod;
  status: ContractStatus;
  isPublic: boolean;
  totalPaid: number;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    contractNumber:    { type: String, required: true, unique: true },
    title:             { type: String, required: true },
    description:       { type: String },
    vendor:            { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    department:        { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    createdBy:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contractValue:     { type: Number, required: true, min: 0 },
    currency:          { type: String, default: 'USD' },
    startDate:         { type: Date, required: true },
    endDate:           { type: Date, required: true },
    procurementMethod: { type: String, enum: PROCUREMENT_METHODS, required: true },
    status:            { type: String, enum: CONTRACT_STATUSES, default: 'draft' },
    isPublic:          { type: Boolean, default: false },
    totalPaid:         { type: Number, default: 0 },
    category:          { type: String },
    tags:              [String],
  },
  { timestamps: true }
);

ContractSchema.index({ title: 'text', description: 'text' });
ContractSchema.index({ vendor: 1, status: 1 });
ContractSchema.index({ department: 1, status: 1 });

export const Contract = model<IContract>('Contract', ContractSchema);
