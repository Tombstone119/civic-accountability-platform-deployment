/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { Audit } from '../models/Audit';
import { AuditFinding } from '../models/AuditFinding';
import { Vendor } from '../models/Vendor';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { RiskRating } from '../utils/enums';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAuditFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (query.auditType)  filter.auditType  = query.auditType;
  if (query.status)     filter.status     = query.status;
  if (query.riskRating) filter.riskRating = query.riskRating;
  if (query.contract)   filter.contract   = query.contract;
  if (query.vendor)     filter.vendor     = query.vendor;
  if (query.auditor)    filter.auditor    = query.auditor;
  return filter;
}

/**
 * Derive the highest risk rating from all findings for an audit.
 * Order: critical > high > medium > low.
 * Returns 'low' when there are no findings.
 */
async function computeAuditRisk(auditId: string): Promise<RiskRating> {
  const findings = await AuditFinding.find({ audit: auditId } as any);
  if (findings.some((f) => f.severity === 'critical')) return 'critical';
  if (findings.some((f) => f.severity === 'high'))     return 'high';
  if (findings.some((f) => f.severity === 'medium'))   return 'medium';
  return 'low';
}

/**
 * Recompute riskRating and complianceOutcome on the parent audit after any finding change.
 * complianceOutcome = 'compliant' when no findings; 'non_compliant' when open critical/high;
 * 'partially_compliant' when some resolved; 'pending' otherwise.
 */
async function refreshAuditRisk(auditId: string) {
  const [riskRating, findings] = await Promise.all([
    computeAuditRisk(auditId),
    AuditFinding.find({ audit: auditId } as any),
  ]);

  let complianceOutcome: 'compliant' | 'non_compliant' | 'partially_compliant' | 'pending' = 'pending';
  if (findings.length === 0) {
    complianceOutcome = 'compliant';
  } else if (findings.every((f) => f.status === 'resolved' || f.status === 'dismissed')) {
    complianceOutcome = 'compliant';
  } else if (findings.some((f) => f.status === 'resolved' || f.status === 'dismissed')) {
    complianceOutcome = 'partially_compliant';
  } else if (findings.some((f) => f.severity === 'critical' || f.severity === 'high')) {
    complianceOutcome = 'non_compliant';
  }

  await Audit.findByIdAndUpdate(auditId, { riskRating, complianceOutcome });
  return { riskRating, complianceOutcome };
}

/**
 * Recompute vendor performanceScore as a weighted average across all their audits.
 * Mapping: critical=10, high=35, medium=65, low=90 (higher = better performance).
 */
async function refreshVendorPerformance(vendorId: string) {
  const audits = await Audit.find({ vendor: vendorId, riskRating: { $exists: true } } as any);
  if (!audits.length) return;

  const scoreMap: Record<RiskRating, number> = {
    critical: 10,
    high: 35,
    medium: 65,
    low: 90,
  };

  const total = audits.reduce((sum, a) => sum + (scoreMap[a.riskRating as RiskRating] ?? 65), 0);
  const performanceScore = Math.round(total / audits.length);

  await Vendor.findByIdAndUpdate(vendorId, { performanceScore });
}

// ─── Audit Service ────────────────────────────────────────────────────────────

export const auditService = {
  /**
   * Paginated audit list.
   * Filters: auditType, status, riskRating, contract, vendor, auditor
   */
  getAll: async (page = 1, limit = 10, query: Record<string, unknown> = {}) => {
    const sanitizedPage  = Math.max(1, Math.floor(Number(page) || 1));
    const sanitizedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 10)));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const filter = buildAuditFilter(query);

    const [data, total] = await Promise.all([
      Audit.find(filter as any)
        .populate('contract', 'contractNumber title')
        .populate('vendor', 'name registrationNumber')
        .populate('auditor', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(sanitizedLimit),
      Audit.countDocuments(filter as any),
    ]);

    // Attach finding counts
    const auditIds = data.map((a) => a._id);
    const findingCounts = await AuditFinding.aggregate([
      { $match: { audit: { $in: auditIds } } },
      {
        $group: {
          _id: '$audit',
          total: { $sum: 1 },
          unresolved: { $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0] } },
        },
      },
    ]);

    const countMap = new Map(findingCounts.map((fc) => [String(fc._id), fc]));

    const enriched = data.map((audit) => {
      const plain = audit.toObject() as any;
      const counts = countMap.get(String(audit._id));
      plain.findingCount    = counts?.total      ?? 0;
      plain.unresolvedCount = counts?.unresolved ?? 0;
      return plain;
    });

    return { data: enriched, total, page: sanitizedPage, limit: sanitizedLimit,
             totalPages: Math.max(1, Math.ceil(total / sanitizedLimit)) };
  },

  /** Single audit with full population and all findings. */
  getById: async (id: string) => {
    const audit = await Audit.findById(id)
      .populate('contract', 'contractNumber title status contractValue')
      .populate('vendor', 'name registrationNumber isBlacklisted performanceScore')
      .populate('auditor', 'name email');

    if (!audit) throw new NotFoundError('Audit not found');

    const findings = await AuditFinding.find({ audit: id } as any)
      .sort({ createdAt: 1 });

    return { audit, findings };
  },

  /**
   * Create a new audit. Auditor is set from the authenticated user.
   * After creation, riskRating and complianceOutcome are computed from findings
   * if any are supplied inline (optional bulk create on POST body).
   */
  create: async (data: Record<string, any>, userId: string) => {
    const { findings: inlineFindings, ...auditData } = data;

    // Auto-generate auditNumber if not provided
    if (!auditData.auditNumber) {
      const year = new Date().getFullYear();
      const count = await Audit.countDocuments();
      auditData.auditNumber = `AUD-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    const audit = await Audit.create({
      ...auditData,
      auditor: new Types.ObjectId(userId),
    } as any);

    // Optionally bulk-create findings supplied with the audit
    if (Array.isArray(inlineFindings) && inlineFindings.length > 0) {
      const docs = inlineFindings.map((f: any) => ({
        ...f,
        audit: audit._id,
        status: 'open',
      }));
      await AuditFinding.insertMany(docs);
      await refreshAuditRisk(String(audit._id));
    }

    // Update vendor performance score if vendor is linked
    if (auditData.vendor) {
      await refreshVendorPerformance(String(auditData.vendor));
    }

    const populated = await Audit.findById(audit._id)
      .populate('contract', 'contractNumber title')
      .populate('vendor', 'name registrationNumber')
      .populate('auditor', 'name email');

    return populated!;
  },

  /**
   * Update an audit.
   * Rule AR-02: auditors can only edit their own audits; admin can edit any.
   */
  update: async (
    id: string,
    data: Record<string, any>,
    userId: string,
    userRole: string
  ) => {
    const audit = await Audit.findById(id);
    if (!audit) throw new NotFoundError('Audit not found');

    // Ownership check for non-admin auditors
    if (userRole === 'auditor' && String(audit.auditor) !== userId) {
      throw new ForbiddenError('Auditors can only edit their own audits');
    }

    // Prevent modification of cancelled audits
    if (audit.status === 'cancelled') {
      throw new BadRequestError('Cancelled audits cannot be modified');
    }

    // Strip protected fields
    const { auditor, _id, createdAt, updatedAt, ...safeData } = data;
    void auditor; void _id; void createdAt; void updatedAt;

    const updated = await Audit.findByIdAndUpdate(id, safeData as any, {
      new: true,
      runValidators: true,
    })
      .populate('contract', 'contractNumber title')
      .populate('vendor', 'name registrationNumber')
      .populate('auditor', 'name email');

    // Refresh vendor performance if vendor or risk-related fields changed
    const vendorId = data.vendor ?? String(audit.vendor);
    if (vendorId) {
      await refreshVendorPerformance(String(vendorId));
    }

    return updated!;
  },

  /**
   * Delete an audit and cascade its findings.
   */
  delete: async (id: string) => {
    const audit = await Audit.findById(id);
    if (!audit) throw new NotFoundError('Audit not found');

    const vendorId = audit.vendor ? String(audit.vendor) : null;

    await AuditFinding.deleteMany({ audit: id } as any);
    await Audit.findByIdAndDelete(id);

    // Re-sync vendor performance without this audit
    if (vendorId) {
      await refreshVendorPerformance(vendorId);
    }
  },

  // ─── Findings ────────────────────────────────────────────────────────────────

  /** List all findings for an audit. */
  getFindings: async (auditId: string) => {
    const audit = await Audit.findById(auditId);
    if (!audit) throw new NotFoundError('Audit not found');

    return AuditFinding.find({ audit: auditId } as any)
      .sort({ createdAt: 1 });
  },

  /**
   * Add a finding to an audit.
   * Triggers riskRating + complianceOutcome refresh on the parent audit.
   */
  addFinding: async (auditId: string, data: Record<string, any>) => {
    const audit = await Audit.findById(auditId);
    if (!audit) throw new NotFoundError('Audit not found');

    if (audit.status === 'cancelled') {
      throw new BadRequestError('Cannot add findings to a cancelled audit');
    }

    const finding = await AuditFinding.create({
      ...data,
      audit: new Types.ObjectId(auditId),
      status: data.status ?? 'open',
    } as any);

    const riskRefresh = await refreshAuditRisk(auditId);

    // Refresh vendor performance when a new finding affects risk
    if (audit.vendor) {
      await refreshVendorPerformance(String(audit.vendor));
    }

    return { finding, auditRisk: riskRefresh };
  },

  /**
   * Update a finding.
   * Always refreshes parent audit risk after the change.
   */
  updateFinding: async (
    auditId: string,
    findingId: string,
    data: Record<string, any>,
    _userId: string
  ) => {
    const finding = await AuditFinding.findOne({ _id: findingId, audit: auditId } as any);
    if (!finding) throw new NotFoundError('Finding not found on this audit');

    const updated = await AuditFinding.findByIdAndUpdate(findingId, data as any, {
      new: true,
      runValidators: true,
    });

    const riskRefresh = await refreshAuditRisk(auditId);

    // Refresh vendor performance
    const audit = await Audit.findById(auditId);
    if (audit?.vendor) {
      await refreshVendorPerformance(String(audit.vendor));
    }

    return { finding: updated!, auditRisk: riskRefresh };
  },

  /**
   * Delete a finding and refresh parent audit risk.
   */
  deleteFinding: async (auditId: string, findingId: string) => {
    const finding = await AuditFinding.findOne({ _id: findingId, audit: auditId } as any);
    if (!finding) throw new NotFoundError('Finding not found on this audit');

    await AuditFinding.findByIdAndDelete(findingId);

    const riskRefresh = await refreshAuditRisk(auditId);

    const audit = await Audit.findById(auditId);
    if (audit?.vendor) {
      await refreshVendorPerformance(String(audit.vendor));
    }

    return { auditRisk: riskRefresh };
  },
};
