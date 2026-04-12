import { Schema, model, Document } from 'mongoose';

export interface IPublicRecord extends Document {
  contract: Schema.Types.ObjectId;
  publishedBy: Schema.Types.ObjectId;
  publishedAt: Date;
  title: string;
  summary?: string;
  tags: string[];
  viewCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PublicRecordSchema = new Schema<IPublicRecord>(
  {
    contract:    { type: Schema.Types.ObjectId, ref: 'Contract', required: true, unique: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: Date.now },
    title:       { type: String, required: true },
    summary:     { type: String },
    tags:        [String],
    viewCount:   { type: Number, default: 0 },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PublicRecord = model<IPublicRecord>('PublicRecord', PublicRecordSchema);
