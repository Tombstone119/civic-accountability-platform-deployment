import { Schema, model, Document } from 'mongoose';

export type VendorStatus = 'active' | 'inactive' | 'blacklisted' | 'under_review';

export interface IVendor extends Document {
  name: string;
  registrationNumber: string;
  email: string;
  phone?: string;
  address?: string;
  category?: string;
  status: VendorStatus;
  isBlacklisted: boolean;
  blacklistReason?: string;
  blacklistedAt?: Date;
  blacklistedBy?: Schema.Types.ObjectId;
  totalContractsValue: number;
  performanceScore?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    name:                 { type: String, required: true, trim: true },
    registrationNumber:   { type: String, required: true, unique: true },
    email:                { type: String, required: true },
    phone:                { type: String },
    address:              { type: String },
    category:             { type: String },
    status:               { type: String, enum: ['active', 'inactive', 'blacklisted', 'under_review'], default: 'active' },
    isBlacklisted:        { type: Boolean, default: false },
    blacklistReason:      { type: String },
    blacklistedAt:        { type: Date },
    blacklistedBy:        { type: Schema.Types.ObjectId, ref: 'User' },
    totalContractsValue:  { type: Number, default: 0 },
    performanceScore:     { type: Number, min: 0, max: 100 },
    isActive:             { type: Boolean, default: true },
  },
  { timestamps: true }
);

VendorSchema.index({ name: 'text', registrationNumber: 'text' });

export const Vendor = model<IVendor>('Vendor', VendorSchema);
