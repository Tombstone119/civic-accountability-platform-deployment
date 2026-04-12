import { Schema, model, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  description?: string;
  budget: number;
  fiscalYear?: number;
  headOfDepartment?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name:             { type: String, required: true, unique: true, trim: true },
    code:             { type: String, required: true, unique: true, uppercase: true },
    description:      { type: String },
    budget:           { type: Number, default: 0, min: 0 },
    fiscalYear:       { type: Number },
    headOfDepartment: { type: String },
    isActive:         { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Department = model<IDepartment>('Department', DepartmentSchema);
