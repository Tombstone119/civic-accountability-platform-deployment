import { Schema, model, Document } from 'mongoose';

export interface IVendorDocument extends Document {
  vendor: Schema.Types.ObjectId;
  documentType: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  isVerified: boolean;
  verifiedBy?: Schema.Types.ObjectId;
  verifiedAt?: Date;
  fileUrl?: string;
  gridfsId?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  isExpired: boolean; // virtual
  createdAt: Date;
  updatedAt: Date;
}

const VendorDocumentSchema = new Schema<IVendorDocument>(
  {
    vendor:         { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    documentType:   { type: String, required: true }, // 'tax_clearance', 'business_license', etc.
    documentNumber: { type: String },
    issueDate:      { type: Date },
    expiryDate:     { type: Date },
    isVerified:     { type: Boolean, default: false },
    verifiedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt:     { type: Date },
    fileUrl:        { type: String },
    gridfsId:       { type: String },
    originalName:   { type: String },
    mimeType:       { type: String },
    fileSize:       { type: Number },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: expired
VendorDocumentSchema.virtual('isExpired').get(function () {
  return this.expiryDate ? this.expiryDate < new Date() : false;
});

export const VendorDocument = model<IVendorDocument>('VendorDocument', VendorDocumentSchema);
