/* eslint-disable @typescript-eslint/no-explicit-any */
import { Department, IDepartment } from '../models/Department';
import { Contract } from '../models/Contract';
import { User } from '../models/User';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';

export const departmentService = {
  /**
   * All active departments, sorted by name.
   * Optionally includes inactive ones via query.includeInactive.
   */
  getAll: async (query: Record<string, unknown> = {}) => {
    const filter: Record<string, unknown> = {};
    if (query.includeInactive !== 'true') filter.isActive = true;
    if (query.search) filter.$text = { $search: String(query.search) };

    return Department.find(filter as any).sort({ name: 1 });
  },

  getById: async (id: string) => {
    const department = await Department.findById(id);
    if (!department) throw new NotFoundError('Department not found');

    const [contractCount, userCount] = await Promise.all([
      Contract.countDocuments({ department: id } as any),
      User.countDocuments({ department: id } as any),
    ]);

    return { department, contractCount, userCount };
  },

  create: async (data: Partial<IDepartment>) => {
    // Check uniqueness manually for a clear error message
    const [nameTaken, codeTaken] = await Promise.all([
      Department.findOne({ name: data.name }),
      Department.findOne({ code: String(data.code).toUpperCase() }),
    ]);
    if (nameTaken) throw new ConflictError(`Department name '${data.name}' already exists`);
    if (codeTaken) throw new ConflictError(`Department code '${data.code}' already exists`);

    return Department.create(data);
  },

  update: async (id: string, data: Partial<IDepartment>) => {
    const department = await Department.findById(id);
    if (!department) throw new NotFoundError('Department not found');

    // Uniqueness check only when the value is actually changing
    if (data.name && data.name !== department.name) {
      const taken = await Department.findOne({ name: data.name, _id: { $ne: id } } as any);
      if (taken) throw new ConflictError(`Department name '${data.name}' already exists`);
    }
    if (data.code && data.code.toUpperCase() !== department.code) {
      const taken = await Department.findOne({ code: data.code.toUpperCase(), _id: { $ne: id } } as any);
      if (taken) throw new ConflictError(`Department code '${data.code}' already exists`);
    }

    const updated = await Department.findByIdAndUpdate(id, data as any, {
      new: true,
      runValidators: true,
    });

    return updated!;
  },

  /**
   * Hard delete blocked if any contracts reference this department.
   * Admins should reassign users before deleting.
   */
  delete: async (id: string) => {
    const department = await Department.findById(id);
    if (!department) throw new NotFoundError('Department not found');

    const contractCount = await Contract.countDocuments({ department: id } as any);
    if (contractCount > 0) {
      throw new ConflictError(
        `Cannot delete department: ${contractCount} contract(s) reference it. Deactivate instead.`
      );
    }

    await Department.findByIdAndDelete(id);
  },
};
