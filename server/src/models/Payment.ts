import { Schema, model, Document } from 'mongoose';
import { PAYMENT_STATUSES, PaymentStatus } from '../utils/enums';

export type PaymentType = 'advance' | 'milestone' | 'final' | 'installment';

export interface IPayment extends Document {
  contract: Schema.Types.ObjectId;
  vendor: Schema.Types.ObjectId;
  amount: number;
  currency: string;
  paymentDate: Date;
  paymentType?: PaymentType;
  referenceNumber?: string;
  description?: string;
  status: PaymentStatus;
  processedBy?: Schema.Types.ObjectId;
  notes?: string;
  isOverpayment: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    contract:        { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    vendor:          { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    amount:          { type: Number, required: true, min: 0 },
    currency:        { type: String, default: 'USD' },
    paymentDate:     { type: Date, required: true },
    paymentType:     { type: String, enum: ['advance', 'milestone', 'final', 'installment'] },
    referenceNumber: { type: String, unique: true, sparse: true },
    description:     { type: String },
    status:          { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    processedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    notes:           { type: String },
    isOverpayment:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>('Payment', PaymentSchema);
