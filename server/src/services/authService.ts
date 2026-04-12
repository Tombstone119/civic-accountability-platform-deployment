import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { UserRole } from '../utils/enums';
import { NotFoundError } from '../utils/errors';

export const authService = {
  register: async (name: string, email: string, password: string, role?: UserRole, departmentId?: string) => {
    const existing = await User.findOne({ email });
    if (existing) throw new Error('User already exists with this email');

    const user = await User.create({ name, email, password, role: role ?? 'viewer', ...(departmentId && { department: departmentId }) } as any);

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpire } as jwt.SignOptions
    );

    return { user, token };
  },

  login: async (email: string, password: string) => {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) throw new Error('Invalid credentials');

    const isValid = await user.comparePassword(password);
    if (!isValid) throw new Error('Invalid credentials');

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpire } as jwt.SignOptions
    );

    return { user, token };
  },

  getProfile: async (userId: string) => {
    const user = await User.findById(userId).populate('department', 'name code');
    if (!user) throw new NotFoundError('User not found');
    return user;
  },
};
