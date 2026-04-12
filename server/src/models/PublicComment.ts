import { Schema, model, Document } from 'mongoose';

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface IPublicComment extends Document {
  publicRecord: Schema.Types.ObjectId;
  authorName: string;
  authorEmail?: string;
  content: string;
  isAnonymous: boolean;
  isFlagged: boolean;
  flagReason?: string;
  status: CommentStatus;
  isWhistleblower: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PublicCommentSchema = new Schema<IPublicComment>(
  {
    publicRecord:    { type: Schema.Types.ObjectId, ref: 'PublicRecord', required: true },
    authorName:      { type: String, required: true },
    authorEmail:     { type: String },
    content:         { type: String, required: true, maxlength: 2000 },
    isAnonymous:     { type: Boolean, default: false },
    isFlagged:       { type: Boolean, default: false },
    flagReason:      { type: String },
    status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isWhistleblower: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PublicComment = model<IPublicComment>('PublicComment', PublicCommentSchema);
