/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Contract } from '../models/Contract';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { USER_ROLES, UserRole } from '../utils/enums';

function buildUserFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (query.role)     filter.role     = query.role;
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (query.department) filter.department = query.department;
  return filter;
}

export const userService = {
  /**
   * Paginated user list.
   * Filters: role, isActive, department
   */
  getAll: async (page = 1, limit = 10, query: Record<string, unknown> = {}) => {
    const sanitizedPage  = Math.max(1, Math.floor(Number(page) || 1));
    const sanitizedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 10)));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const filter = buildUserFilter(query);

    const [data, total] = await Promise.all([
      User.find(filter as any)
        .populate('department', 'name code')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(sanitizedLimit),
      User.countDocuments(filter as any),
    ]);

    return { data, total, page: sanitizedPage, limit: sanitizedLimit,
             totalPages: Math.max(1, Math.ceil(total / sanitizedLimit)) };
  },

  getById: async (id: string) => {
    const user = await User.findById(id)
      .populate('department', 'name code')
      .select('-password');
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  /**
   * Admin update: can change role, isActive, department.
   * Cannot deactivate or demote self.
   * Password changes are only via updateProfile (self-service).
   */
  update: async (id: string, data: Record<string, any>, requestingUserId: string) => {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User not found');

    const isSelf = id === requestingUserId;

    if (isSelf && data.isActive === false) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }
    if (isSelf && data.role && data.role !== user.role) {
      throw new ForbiddenError('You cannot change your own role');
    }

    // Validate role if provided
    if (data.role && !USER_ROLES.includes(data.role as UserRole)) {
      throw new BadRequestError(`Invalid role '${data.role}'`);
    }

    // Strip fields that must not be changed via this endpoint
    const { password, email, _id, createdAt, updatedAt, ...safeData } = data;
    void password; void email; void _id; void createdAt; void updatedAt;

    const updated = await User.findByIdAndUpdate(id, safeData as any, {
      new: true,
      runValidators: true,
    })
      .populate('department', 'name code')
      .select('-password');

    return updated!;
  },

  /**
   * Hard delete a user.
   * Blocked for: self-deletion, users assigned as createdBy on contracts.
   */
  delete: async (id: string, requestingUserId: string) => {
    if (id === requestingUserId) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User not found');

    // Block if user has created any contracts (audit trail must be preserved)
    const contractCount = await Contract.countDocuments({ createdBy: id } as any);
    if (contractCount > 0) {
      throw new ConflictError(
        `Cannot delete user: they are linked to ${contractCount} contract(s). Deactivate instead.`
      );
    }

    await User.findByIdAndDelete(id);
  },

  // ─── Self-service profile update (auth route) ─────────────────────────────

  /**
   * Authenticated users can update their own name and/or password.
   * Requires current password when changing password.
   */
  updateProfile: async (
    userId: string,
    data: { name?: string; currentPassword?: string; newPassword?: string }
  ) => {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new NotFoundError('User not found');

    if (data.name) {
      user.name = data.name;
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestError('Current password is required to set a new password');
      }
      const valid = await user.comparePassword(data.currentPassword);
      if (!valid) {
        throw new BadRequestError('Current password is incorrect');
      }
      if (data.newPassword.length < 6) {
        throw new BadRequestError('New password must be at least 6 characters');
      }
      user.password = data.newPassword; // pre-save hook will hash it
    }

    await user.save();

    // Return user without password (toJSON transform strips it)
    return User.findById(userId).populate('department', 'name code');
  },
};
