/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { Vendor, IVendor } from '../models/Vendor';
import { VendorDocument } from '../models/VendorDocument';
import { Contract } from '../models/Contract';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildVendorFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};

  if (query.isBlacklisted !== undefined) {
    filter.isBlacklisted = query.isBlacklisted === 'true' || query.isBlacklisted === true;
  }
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.search) {
    filter.$text = { $search: String(query.search) };
  }

  return filter;
}

// ─── Vendor CRUD ──────────────────────────────────────────────────────────────

export const vendorService = {
  /**
   * Paginated vendor list with optional filtering.
   * Filters: search (text), isBlacklisted, isActive, category
   */
  getAll: async (page = 1, limit = 10, query: Record<string, unknown> = {}) => {
    const sanitizedPage  = Math.max(1, Math.floor(Number(page) || 1));
    const sanitizedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 10)));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const filter = buildVendorFilter(query);

    const [data, total] = await Promise.all([
      Vendor.find(filter as any)
        .populate('blacklistedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(sanitizedLimit),
      Vendor.countDocuments(filter as any),
    ]);

    return {
      data,
      total,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalPages: Math.max(1, Math.ceil(total / sanitizedLimit)),
    };
  },

  /**
   * Single vendor with compliance documents and contract count.
   */
  getById: async (id: string) => {
    const vendor = await Vendor.findById(id).populate('blacklistedBy', 'name email');
    if (!vendor) throw new NotFoundError('Vendor not found');

    const [documents, contractCount] = await Promise.all([
      VendorDocument.find({ vendor: id } as any)
        .populate('verifiedBy', 'name email')
        .sort({ createdAt: -1 }),
      Contract.countDocuments({ vendor: id } as any),
    ]);

    return { vendor, documents, contractCount };
  },

  /**
   * Create vendor. Rejects duplicate registrationNo.
   */
  create: async (data: Partial<IVendor>) => {
    const existing = await Vendor.findOne({ registrationNumber: data.registrationNumber });
    if (existing) throw new ConflictError(`Registration number '${data.registrationNumber}' already exists`);

    const vendor = await Vendor.create(data);
    return vendor;
  },

  /**
   * Update vendor fields. Prevents overwriting blacklist-controlled fields.
   */
  update: async (id: string, data: Record<string, unknown>) => {
    // Blacklist fields are only changed through dedicated endpoints
    const { isBlacklisted, blacklistReason, blacklistedAt, blacklistedBy, ...safeData } = data;
    void isBlacklisted; void blacklistReason; void blacklistedAt; void blacklistedBy;

    const vendor = await Vendor.findByIdAndUpdate(id, safeData as any, {
      new: true,
      runValidators: true,
    }).populate('blacklistedBy', 'name email');

    if (!vendor) throw new NotFoundError('Vendor not found');
    return vendor;
  },

  /**
   * Delete vendor. Blocked if non-draft contracts exist.
   * Cascades to VendorDocuments.
   */
  delete: async (id: string) => {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new NotFoundError('Vendor not found');

    // Cancel all non-draft contracts linked to this vendor before deleting
    await Contract.updateMany(
      { vendor: id, status: { $ne: 'draft' } } as any,
      { $set: { status: 'cancelled' } } as any
    );

    await VendorDocument.deleteMany({ vendor: id } as any);
    await Vendor.findByIdAndDelete(id);
  },

  // ─── Blacklist ──────────────────────────────────────────────────────────────

  /**
   * Blacklist a vendor. Any future contract creation against this vendor is blocked.
   */
  blacklist: async (id: string, reason: string, adminUserId: string) => {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new NotFoundError('Vendor not found');
    if (vendor.isBlacklisted) throw new BadRequestError('Vendor is already blacklisted');

    const updated = await Vendor.findByIdAndUpdate(
      id,
      {
        isBlacklisted: true,
        blacklistReason: reason,
        blacklistedAt: new Date(),
        blacklistedBy: new Types.ObjectId(adminUserId),
      },
      { new: true }
    ).populate('blacklistedBy', 'name email');

    return updated!;
  },

  /**
   * Remove a vendor from the blacklist.
   */
  unblacklist: async (id: string) => {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new NotFoundError('Vendor not found');
    if (!vendor.isBlacklisted) throw new BadRequestError('Vendor is not blacklisted');

    const updated = await Vendor.findByIdAndUpdate(
      id,
      {
        isBlacklisted: false,
        $unset: { blacklistReason: '', blacklistedAt: '', blacklistedBy: '' },
      },
      { new: true }
    );

    return updated!;
  },

  // ─── Documents ──────────────────────────────────────────────────────────────

  getDocuments: async (vendorId: string) => {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new NotFoundError('Vendor not found');

    return VendorDocument.find({ vendor: vendorId } as any)
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });
  },

  addDocument: async (
    vendorId: string,
    data: {
      documentType: string;
      documentNumber?: string;
      issueDate?: Date;
      expiryDate?: Date;
      fileUrl?: string;
    }
  ) => {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new NotFoundError('Vendor not found');

    const doc = await VendorDocument.create({ vendor: new Types.ObjectId(vendorId), ...data } as any);
    return doc;
  },

  updateDocument: async (
    vendorId: string,
    docId: string,
    data: Record<string, unknown>
  ) => {
    // Ensure doc belongs to this vendor
    const doc = await VendorDocument.findOne({ _id: docId, vendor: vendorId } as any);
    if (!doc) throw new NotFoundError('Document not found for this vendor');

    // If marking verified, record timestamp
    const update: Record<string, unknown> = { ...data };
    if (data.isVerified && !doc.isVerified) {
      update.verifiedAt = new Date();
    }
    if (data.verifiedBy && typeof data.verifiedBy === 'string') {
      update.verifiedBy = new Types.ObjectId(data.verifiedBy);
    }

    const updated = await VendorDocument.findByIdAndUpdate(docId, update as any, {
      new: true,
      runValidators: true,
    }).populate('verifiedBy', 'name email');

    return updated!;
  },

  deleteDocument: async (vendorId: string, docId: string) => {
    const doc = await VendorDocument.findOne({ _id: docId, vendor: vendorId } as any);
    if (!doc) throw new NotFoundError('Document not found for this vendor');

    await VendorDocument.findByIdAndDelete(docId);
  },

  // ─── Business Logic ─────────────────────────────────────────────────────────

  /**
   * Returns true when all verified documents are non-expired.
   * Used by contractService before allowing contract creation.
   */
  checkDocumentCompliance: async (vendorId: string): Promise<boolean> => {
    const docs = await VendorDocument.find({ vendor: vendorId, isVerified: true } as any);
    return docs.every((d) => !d.isExpired);
  },
};
