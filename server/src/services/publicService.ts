/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicRecord } from '../models/PublicRecord';
import { PublicComment } from '../models/PublicComment';
import { Department } from '../models/Department';
import { SpendingSummary } from '../models/SpendingSummary';
import { Audit } from '../models/Audit';
import { BadRequestError, NotFoundError } from '../utils/errors';

// ─── Public Service ───────────────────────────────────────────────────────────

export const publicService = {
  /**
   * Paginated list of active public records.
   * Filters: q (text search on title/summary), tags
   * Rule PP-01: publishedBy is excluded from the response.
   */
  getRecords: async (page = 1, limit = 12, query: Record<string, unknown> = {}) => {
    const sanitizedPage  = Math.max(1, Math.floor(Number(page) || 1));
    const sanitizedLimit = Math.min(50, Math.max(1, Math.floor(Number(limit) || 12)));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const filter: Record<string, unknown> = { isActive: true };

    if (query.q) {
      filter.$or = [
        { title:   { $regex: query.q, $options: 'i' } },
        { summary: { $regex: query.q, $options: 'i' } },
      ];
    }

    if (query.tags) {
      const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
      filter.tags = { $in: tags };
    }

    const [data, total] = await Promise.all([
      PublicRecord.find(filter as any)
        .populate({
          path: 'contract',
          select: 'contractNumber title contractValue procurementMethod startDate endDate status',
          populate: [
            { path: 'vendor',     select: 'name' },
            { path: 'department', select: 'name code' },
          ],
        })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(sanitizedLimit)
        .select('-publishedBy'),
      PublicRecord.countDocuments(filter as any),
    ]);

    return {
      data,
      total,
      page:       sanitizedPage,
      limit:      sanitizedLimit,
      totalPages: Math.max(1, Math.ceil(total / sanitizedLimit)),
    };
  },

  /**
   * Single public record — atomically increments viewCount.
   * Returns the record and its approved comments only.
   * Rule PP-04: viewCount increment is atomic via $inc.
   */
  getRecordById: async (id: string) => {
    const record = await PublicRecord.findOneAndUpdate(
      { _id: id, isActive: true } as any,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate({
      path: 'contract',
      select: 'contractNumber title description contractValue procurementMethod startDate endDate status category tags',
      populate: [
        { path: 'vendor',     select: 'name registrationNumber' },
        { path: 'department', select: 'name code' },
      ],
    });

    if (!record) throw new NotFoundError('Public record not found');

    // Rule PP-02: only approved comments are returned on the public view
    const comments = await PublicComment.find({
      publicRecord: id,
      status:       'approved',
    } as any)
      .sort({ createdAt: -1 })
      .select('-authorEmail -flagReason'); // PP-01: hide internal fields

    return { record, comments };
  },

  /**
   * All approved comments for a public record.
   * Rule PP-02: pending/rejected comments are never returned here.
   */
  getComments: async (recordId: string) => {
    const record = await PublicRecord.findOne({ _id: recordId, isActive: true } as any);
    if (!record) throw new NotFoundError('Public record not found');

    return PublicComment.find({ publicRecord: recordId, status: 'approved' } as any)
      .sort({ createdAt: -1 })
      .select('-authorEmail -flagReason');
  },

  /**
   * Submit a citizen comment on a public record.
   * Rule PP-02: always created with status 'pending' — never visible publicly until approved.
   * Rule PP-03: content 10–2000 chars, authorName 2–100 chars (enforced by validator).
   */
  addComment: async (recordId: string, data: Record<string, any>) => {
    const record = await PublicRecord.findOne({ _id: recordId, isActive: true } as any);
    if (!record) throw new NotFoundError('Public record not found');

    const comment = await PublicComment.create({
      publicRecord:    recordId,
      authorName:      data.authorName,
      authorEmail:     data.authorEmail,
      content:         data.content,
      isAnonymous:     data.isAnonymous     ?? false,
      isWhistleblower: data.isWhistleblower ?? false,
      status:          'pending',
    } as any);

    return comment;
  },

  /**
   * Admin: paginated list of all comments with optional filters.
   * Filters: status ('pending'|'approved'|'rejected'), isFlagged (boolean).
   */
  getAllComments: async (query: Record<string, unknown> = {}) => {
    const page  = Math.max(1, Math.floor(Number(query.page)  || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(query.limit) || 15)));
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.isFlagged === 'true' || query.isFlagged === true) filter.isFlagged = true;

    const [data, total] = await Promise.all([
      PublicComment.find(filter as any)
        .populate('publicRecord', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PublicComment.countDocuments(filter as any),
    ]);

    return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  /**
   * Public overview — no auth required.
   * Returns aggregate stats, departments, spending summaries, and recent audit snapshots
   * for the public transparency dashboard.
   */
  getPublicOverview: async () => {
    const [departments, spendingSummaries, recentAudits, allAudits, totalRecords, valueRecords] =
      await Promise.all([
        Department.find({ isActive: true } as any)
          .sort({ name: 1 })
          .select('name code budget fiscalYear description'),
        SpendingSummary.find()
          .populate('department', 'name code')
          .sort({ totalSpend: -1 })
          .limit(10),
        Audit.find()
          .select('auditNumber title status riskRating auditType startDate complianceOutcome')
          .sort({ createdAt: -1 })
          .limit(6),
        Audit.find().select('riskRating status'),
        PublicRecord.countDocuments({ isActive: true } as any),
        PublicRecord.find({ isActive: true } as any)
          .populate({ path: 'contract', select: 'contractValue' })
          .select('contract'),
      ]);

    const totalValue = valueRecords.reduce((sum, r) => {
      return sum + ((r.contract as any)?.contractValue ?? 0);
    }, 0);

    const byRisk: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const byStatus: Record<string, number> = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
    allAudits.forEach(a => {
      if (a.riskRating && byRisk[a.riskRating] !== undefined) byRisk[a.riskRating]++;
      if (a.status && byStatus[a.status] !== undefined) byStatus[a.status]++;
    });

    return {
      stats: {
        totalRecords,
        totalValue,
        departmentCount: departments.length,
        auditCount: allAudits.length,
      },
      departments,
      spendingSummaries,
      recentAudits,
      auditBreakdown: { byRisk, byStatus },
    };
  },

  /**
   * Admin moderation: approve / reject / flag a comment.
   * Only status, isFlagged, and flagReason can be updated.
   */
  moderateComment: async (commentId: string, data: Record<string, any>) => {
    const comment = await PublicComment.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    const update: Record<string, any> = {};
    if (data.status     !== undefined) update.status     = data.status;
    if (data.isFlagged  !== undefined) update.isFlagged  = data.isFlagged;
    if (data.flagReason !== undefined) update.flagReason = data.flagReason;

    if (Object.keys(update).length === 0) {
      throw new BadRequestError('No valid moderation fields provided');
    }

    const updated = await PublicComment.findByIdAndUpdate(commentId, update as any, {
      new:          true,
      runValidators: true,
    });

    return updated!;
  },
};
