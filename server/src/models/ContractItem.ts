import { Schema, model, Document } from 'mongoose';

export interface IContractItem extends Document {
  contract: Schema.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  unit?: string;
  marketPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ContractItemSchema = new Schema<IContractItem>(
  {
    contract:    { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    description: { type: String, required: true },
    quantity:    { type: Number, required: true, min: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
    totalPrice:  { type: Number },
    unit:        { type: String }, // 'units', 'kg', 'hours', etc.
    marketPrice: { type: Number }, // for overpricing detection
  },
  { timestamps: true }
);

// Auto-compute totalPrice before save (Mongoose 9 async hook — no next())
ContractItemSchema.pre('save', function () {
  this.totalPrice = this.quantity * this.unitPrice;
});

export const ContractItem = model<IContractItem>('ContractItem', ContractItemSchema);
