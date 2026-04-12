import { SpendingSummary } from '../models/SpendingSummary';
import { Contract } from '../models/Contract';
import { Payment } from '../models/Payment';
import { Audit } from '../models/Audit';

export const spendingService = {
  // Legacy-compatible methods — controller will be replaced in Phase 4
  getAll: async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      SpendingSummary.find().populate('department', 'name code').skip(skip).limit(limit).sort({ fiscalYear: -1 }),
      SpendingSummary.countDocuments(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: string) => {
    const record = await SpendingSummary.findById(id).populate('department', 'name code');
    if (!record) throw new Error('Spending record not found');
    return record;
  },

  create: async (data: Record<string, unknown>) => {
    return SpendingSummary.create(data);
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const record = await SpendingSummary.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!record) throw new Error('Spending record not found');
    return record;
  },

  delete: async (id: string) => {
    const record = await SpendingSummary.findByIdAndDelete(id);
    if (!record) throw new Error('Spending record not found');
  },

  getByDepartment: async (_department?: string) => {
    return SpendingSummary.aggregate([
      {
        $group: {
          _id: '$department',
          totalSpend:     { $sum: '$totalSpend' },
          totalContracts: { $sum: '$totalContracts' },
          avgRiskScore:   { $avg: '$avgRiskScore' },
        },
      },
      { $sort: { totalSpend: -1 } },
    ]);
  },

  getSummary: async (fiscalYear?: number, departmentId?: string) => {
    const filter: Record<string, unknown> = {};
    if (fiscalYear) filter.fiscalYear = fiscalYear;
    if (departmentId) filter.department = departmentId;

    return SpendingSummary.find(filter)
      .populate('department', 'name code')
      .sort({ fiscalYear: -1 });
  },

  /**
   * Re-aggregate live contract, payment, and audit data for a fiscal year
   * and upsert one SpendingSummary document per department.
   *
   * Fields computed:
   *  - totalSpend / totalContracts / avgContractValue / directAwardCount  ← from Contract
   *  - overpaymentCount   ← from Payment (isOverpayment=true) joined through Contract
   *  - avgRiskScore       ← from Audit riskRating (critical=100 / high=75 / medium=50 / low=25)
   *                           joined through Contract
   *
   * Rule SS-01: only admin can trigger this.
   * Rule SS-03: upsert on compound { department, fiscalYear }.
   */
  refreshSummary: async (fiscalYear: number) => {
    // Inclusive date window for the fiscal year
    const startOfYear = new Date(`${fiscalYear}-01-01T00:00:00.000Z`);
    const endOfYear   = new Date(`${fiscalYear}-12-31T23:59:59.999Z`);

    const yearFilter = {
      startDate: { $lte: endOfYear },
      endDate:   { $gte: startOfYear },
    };

    // ── 1. Contract aggregation (main numbers) ──────────────────────────────
    const contractAgg = await Contract.aggregate([
      { $match: yearFilter },
      {
        $group: {
          _id:              '$department',
          totalSpend:       { $sum: '$totalPaid' },
          totalContracts:   { $sum: 1 },
          avgContractValue: { $avg: '$contractValue' },
          directAwardCount: {
            $sum: { $cond: [{ $eq: ['$procurementMethod', 'direct_award'] }, 1, 0] },
          },
        },
      },
    ]);

    // ── 2. Overpayment count per department ─────────────────────────────────
    // Payment has no department field — join through Contract
    const overpaymentAgg = await Payment.aggregate([
      { $match: { isOverpayment: true } },
      {
        $lookup: {
          from:         'contracts',
          localField:   'contract',
          foreignField: '_id',
          as:           'contractDoc',
        },
      },
      { $unwind: '$contractDoc' },
      { $match: { 'contractDoc.startDate': { $lte: endOfYear }, 'contractDoc.endDate': { $gte: startOfYear } } },
      { $group: { _id: '$contractDoc.department', overpaymentCount: { $sum: 1 } } },
    ]);

    // ── 3. Average risk score per department ────────────────────────────────
    // Map riskRating string → numeric: critical=100, high=75, medium=50, low=25
    const riskAgg = await Audit.aggregate([
      { $match: { contract: { $exists: true }, riskRating: { $exists: true } } },
      {
        $lookup: {
          from:         'contracts',
          localField:   'contract',
          foreignField: '_id',
          as:           'contractDoc',
        },
      },
      { $unwind: '$contractDoc' },
      { $match: { 'contractDoc.startDate': { $lte: endOfYear }, 'contractDoc.endDate': { $gte: startOfYear } } },
      {
        $addFields: {
          riskScore: {
            $switch: {
              branches: [
                { case: { $eq: ['$riskRating', 'critical'] }, then: 100 },
                { case: { $eq: ['$riskRating', 'high'] },     then: 75  },
                { case: { $eq: ['$riskRating', 'medium'] },   then: 50  },
                { case: { $eq: ['$riskRating', 'low'] },      then: 25  },
              ],
              default: null,
            },
          },
        },
      },
      { $match: { riskScore: { $ne: null } } },
      { $group: { _id: '$contractDoc.department', avgRiskScore: { $avg: '$riskScore' } } },
    ]);

    // ── 4. Build lookup maps ────────────────────────────────────────────────
    const overpaymentMap = new Map<string, number>(
      overpaymentAgg.map((r) => [String(r._id), r.overpaymentCount])
    );
    const riskMap = new Map<string, number>(
      riskAgg.map((r) => [String(r._id), Math.round(r.avgRiskScore)])
    );

    // ── 5. Upsert one record per department ────────────────────────────────
    for (const row of contractAgg) {
      const deptKey = String(row._id);
      await SpendingSummary.findOneAndUpdate(
        { fiscalYear, department: row._id },
        {
          totalSpend:       row.totalSpend,
          totalContracts:   row.totalContracts,
          avgContractValue: row.avgContractValue,
          directAwardCount: row.directAwardCount,
          overpaymentCount: overpaymentMap.get(deptKey) ?? 0,
          avgRiskScore:     riskMap.get(deptKey)        ?? 0,
          lastRefreshed:    new Date(),
        },
        { upsert: true, new: true }
      );
    }

    const summaries = await SpendingSummary.find({ fiscalYear }).populate('department', 'name code');
    return { fiscalYear, departmentsUpdated: contractAgg.length, summaries };
  },
};
