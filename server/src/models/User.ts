import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES, UserRole } from '../utils/enums';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: Schema.Types.ObjectId;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true },
    password:   { type: String, required: true, minlength: 6 },
    role:       { type: String, enum: USER_ROLES, default: 'viewer' },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    isActive:   { type: Boolean, default: true },
    lastLogin:  { type: Date },
  },
  { timestamps: true }
);

// Hash password before save (Mongoose 9 async hook — no next())
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Never return password in JSON
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (ret as any).password;
    return ret;
  },
});

export const User = model<IUser>('User', UserSchema);
