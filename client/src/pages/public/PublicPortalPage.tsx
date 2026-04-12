import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import type { PublicRecord, Contract, Vendor, Department, SpendingSummary } from '../../types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:    '#1e3a8a',
  navyLt:  '#3b5fc0',
  teal:    '#0d9488',
  bg:      '#f8fafc',
  surface: '#ffffff',
  surfAlt: '#f1f5f9',
  border:  '#e2e8f0',
  text:    '#0f172a',
  muted:   '#475569',
  faint:   '#94a3b8',
};

const risk: Record<string, { text: string; bg: string; border: string }> = {
  critical: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  high:     { text: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  medium:   { text: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
  low:      { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
};

const status: Record<string, { text: string; bg: string }> = {
  active:      { text: '#16a34a', bg: '#dcfce7' },
  completed:   { text: '#1d4ed8', bg: '#eff6ff' },
  draft:       { text: '#475569', bg: '#f1f5f9' },
  terminated:  { text: '#b91c1c', bg: '#fee2e2' },
  under_review:{ text: '#ea580c', bg: '#fff7ed' },
  planned:     { text: '#475569', bg: '#f1f5f9' },
  in_progress: { text: '#1d4ed8', bg: '#eff6ff' },
  cancelled:   { text: '#b91c1c', bg: '#fee2e2' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

function getContract(r: PublicRecord): Contract | null {
  if (!r.contract || typeof r.contract === 'string') return null;
  return r.contract as Contract;
}

function cap(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? C.navy : C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: '12px',
      padding: '24px',
      flex: 1,
      minWidth: '160px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accent ? '#93c5fd' : C.faint, margin: '0 0 8px' }}>
        {label}
      </p>
      <p style={{ fontSize: '32px', fontWeight: 800, color: accent ? '#fff' : C.navy, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '12px', color: accent ? '#93c5fd' : C.faint, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const r = risk[level] ?? risk.low;
  return (
    <span style={{
      padding: '2px 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.04em', borderRadius: '4px',
      backgroundColor: r.bg, color: r.text, border: `1px solid ${r.border}`,
    }}>
      {level}
    </span>
  );
}

function StatusBadge({ s }: { s: string }) {
  const st = status[s] ?? { text: C.muted, bg: C.surfAlt };
  return (
    <span style={{
      padding: '2px 9px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.04em', borderRadius: '9999px',
      backgroundColor: st.bg, color: st.text,
    }}>
      {cap(s)}
    </span>
  );
}

function RecordCard({ record, onView }: { record: PublicRecord; onView: (id: string) => void }) {
  const contract = getContract(record);
  const s = contract?.status ?? '';
  const st = status[s] ?? { text: C.muted, bg: C.surfAlt };
  const vendor = contract?.vendor;
  const dept = contract?.department;
  const vendorName = vendor !== null && typeof vendor === 'object' ? (vendor as Vendor).name : '—';
  const deptName = dept !== null && typeof dept === 'object' ? (dept as Department).name : '—';

  return (
    <div
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ backgroundColor: st.bg, color: st.text, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {cap(s)}
        </span>
        <span style={{ fontSize: '17px', fontWeight: 700, color: C.navy }}>{fmtFull(contract?.contractValue ?? 0)}</span>
      </div>
      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: C.text, lineHeight: '1.4' }}>{record.title}</h3>
      {deptName && deptName !== '—' && (
        <span style={{ display: 'inline-block', backgroundColor: C.surfAlt, color: C.muted, fontSize: '11px', fontWeight: 500, padding: '2px 9px', borderRadius: '9999px', alignSelf: 'flex-start' }}>
          {deptName}
        </span>
      )}
      <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>
        <span style={{ color: C.faint }}>Vendor: </span>{vendorName}
      </p>
      <p style={{ margin: 0, fontSize: '11px', color: C.faint }}>Published {fmtDate(record.publishedAt)}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: C.faint }}>{record.viewCount} view{record.viewCount !== 1 ? 's' : ''}</span>
        <button
          onClick={() => onView(record._id)}
          style={{ backgroundColor: C.navy, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          View Details →
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface OverviewData {
  stats: { totalRecords: number; totalValue: number; departmentCount: number; auditCount: number };
  departments: Array<{ _id: string; name: string; code: string; budget: number; fiscalYear: number; description?: string }>;
  spendingSummaries: SpendingSummary[];
  recentAudits: Array<{ _id: string; auditNumber: string; title: string; status: string; riskRating: string; auditType: string; startDate: string; complianceOutcome: string }>;
  auditBreakdown: { byRisk: Record<string, number>; byStatus: Record<string, number> };
}

export default function PublicPortalPage() {
  const navigate = useNavigate();

  // Overview data
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Records (public contracts)
  const [records, setRecords] = useState<PublicRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const LIMIT = 9;

  useEffect(() => {
    publicService.getOverview()
      .then(res => { if (res.success) setOverview(res.data); })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, []);

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await publicService.listRecords({ page, limit: LIMIT, search: search || undefined, department: deptFilter || undefined });
      setRecords(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      // silently fail
    } finally {
      setRecordsLoading(false);
    }
  }, [page, search, deptFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const stats = overview?.stats;
  const departments = overview?.departments ?? [];
  const spendingSummaries = overview?.spendingSummaries ?? [];
  const recentAudits = overview?.recentAudits ?? [];
  const auditBreakdown = overview?.auditBreakdown;

  // Spending bar chart
  const maxSpend = spendingSummaries.length > 0 ? Math.max(...spendingSummaries.map(s => s.totalSpend)) : 1;

  const sectionTitle = (_text: string): React.CSSProperties => ({
    fontSize: '18px', fontWeight: 700, color: C.text, margin: '0 0 16px',
  });

  const card: React.CSSProperties = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px',
  };

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLt} 100%)`,
        padding: '64px 24px 48px',
        textAlign: 'center',
        marginLeft: '-24px',
        marginRight: '-24px',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#93c5fd', margin: '0 0 12px' }}>
          Government Transparency
        </p>
        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#ffffff', margin: '0 0 12px', lineHeight: 1.2 }}>
          Civic Accountability Platform
        </h1>
        <p style={{ fontSize: '16px', color: '#bfdbfe', margin: '0 0 32px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Track public spending, audit outcomes, and government contracts. Built for citizens, journalists, and researchers.
        </p>
        <form onSubmit={handleSearch} style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search published contracts..."
            style={{
              flex: 1, padding: '14px 18px', borderRadius: '10px', border: 'none',
              fontSize: '15px', color: C.text, outline: 'none',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          />
          <button type="submit" style={{
            padding: '14px 24px', backgroundColor: C.teal, color: '#fff',
            border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          }}>
            Search
          </button>
        </form>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 0 32px', marginTop: '-24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <StatCard
            label="Published Contracts"
            value={overviewLoading ? '—' : String(stats?.totalRecords ?? 0)}
            sub="Available for public review"
          />
          <StatCard
            label="Total Disclosed Value"
            value={overviewLoading ? '—' : fmt(stats?.totalValue ?? 0)}
            sub="Across all published records"
            accent
          />
          <StatCard
            label="Departments"
            value={overviewLoading ? '—' : String(stats?.departmentCount ?? 0)}
            sub="Government bodies tracked"
          />
          <StatCard
            label="Audit Reports"
            value={overviewLoading ? '—' : String(stats?.auditCount ?? 0)}
            sub="Accountability reviews on record"
          />
        </div>
      </div>

      {/* ── Spending + Audit Breakdown ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

        {/* Spending by Department */}
        <div style={{ ...card, padding: '24px' }}>
          <h2 style={sectionTitle('Spending by Department')}>Spending by Department</h2>
          {overviewLoading ? (
            <p style={{ color: C.faint, fontSize: '14px' }}>Loading...</p>
          ) : spendingSummaries.length === 0 ? (
            <p style={{ color: C.faint, fontSize: '14px' }}>No spending data available yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {spendingSummaries.slice(0, 6).map(s => {
                const dept = typeof s.department === 'object' ? s.department : null;
                const name = dept ? dept.name : '—';
                const pct = maxSpend > 0 ? (s.totalSpend / maxSpend) * 100 : 0;
                return (
                  <div key={s._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy, fontFamily: 'monospace' }}>{fmt(s.totalSpend)}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: C.surfAlt, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: C.navy, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: C.faint, margin: '2px 0 0' }}>
                      {s.totalContracts} contract{s.totalContracts !== 1 ? 's' : ''} · FY {s.fiscalYear}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Risk Breakdown */}
        <div style={{ ...card, padding: '24px' }}>
          <h2 style={sectionTitle('Audit Risk Overview')}>Audit Risk Overview</h2>
          {overviewLoading ? (
            <p style={{ color: C.faint, fontSize: '14px' }}>Loading...</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {(['critical', 'high', 'medium', 'low'] as const).map(level => {
                  const count = auditBreakdown?.byRisk[level] ?? 0;
                  const total = stats?.auditCount ?? 1;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const r = risk[level];
                  return (
                    <div key={level}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: r.text, textTransform: 'capitalize' }}>{level}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{count}</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: C.surfAlt, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: r.text, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                By Status
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(auditBreakdown?.byStatus ?? {}).map(([s, count]) => (
                  <div key={s} style={{ backgroundColor: C.surfAlt, borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: C.navy, margin: 0 }}>{count}</p>
                    <p style={{ fontSize: '11px', color: C.muted, margin: '2px 0 0', textTransform: 'capitalize' }}>{cap(s)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent Audit Reports ─────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: '32px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ ...sectionTitle(''), margin: 0 }}>Recent Audit Reports</h2>
          <p style={{ fontSize: '13px', color: C.faint, margin: '4px 0 0' }}>Most recently conducted accountability reviews</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: C.surfAlt }}>
                {['Audit No.', 'Title', 'Type', 'Status', 'Risk Rating', 'Compliance', 'Start Date'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overviewLoading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: C.faint }}>Loading...</td></tr>
              ) : recentAudits.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: C.faint }}>No audit data available.</td></tr>
              ) : (
                recentAudits.map((a, i) => (
                  <tr key={a._id} style={{ backgroundColor: i % 2 === 0 ? C.surface : C.surfAlt }}>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: C.muted, whiteSpace: 'nowrap' }}>{a.auditNumber}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.text, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: C.muted, whiteSpace: 'nowrap' }}>{cap(a.auditType)}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><StatusBadge s={a.status} /></td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><RiskBadge level={a.riskRating} /></td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><StatusBadge s={a.complianceOutcome} /></td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: C.muted, whiteSpace: 'nowrap' }}>{fmtDate(a.startDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Departments ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={sectionTitle('Government Departments')}>Government Departments</h2>
        <p style={{ fontSize: '13px', color: C.faint, margin: '-10px 0 16px' }}>Approved budget allocations by department and fiscal year</p>
        {overviewLoading ? (
          <p style={{ color: C.faint, fontSize: '14px' }}>Loading...</p>
        ) : departments.length === 0 ? (
          <p style={{ color: C.faint, fontSize: '14px' }}>No department data available.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {departments.map(dept => (
              <div key={dept._id} style={{ ...card, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.teal, margin: '0 0 4px' }}>
                      {dept.code}
                    </p>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.3 }}>{dept.name}</h3>
                  </div>
                  <span style={{ fontSize: '10px', backgroundColor: '#eff6ff', color: C.navy, padding: '2px 8px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    FY {dept.fiscalYear}
                  </span>
                </div>
                {dept.description && (
                  <p style={{ fontSize: '12px', color: C.muted, margin: '0 0 12px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {dept.description}
                  </p>
                )}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '4px' }}>
                  <p style={{ fontSize: '11px', color: C.faint, margin: '0 0 2px' }}>Approved Budget</p>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: C.navy, margin: 0, fontFamily: 'monospace' }}>
                    {fmtFull(dept.budget)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Published Contracts ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={sectionTitle('Published Contracts')}>Published Contracts</h2>
            <p style={{ fontSize: '13px', color: C.faint, margin: '-10px 0 0' }}>
              {total} public record{total !== 1 ? 's' : ''} available
            </p>
          </div>
          {/* Department filter */}
          {departments.length > 0 && (
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={deptFilter}
                onChange={e => { setDeptFilter(e.target.value); setPage(1); setSearch(searchInput); }}
                style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '13px', color: C.text, backgroundColor: C.surface, outline: 'none' }}
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              {(search || deptFilter) && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchInput(''); setDeptFilter(''); setPage(1); }}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '13px', color: C.muted, backgroundColor: C.surface, cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </form>
          )}
        </div>

        {recordsLoading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: C.faint }}>Loading contracts...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: C.faint }}>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>No contracts found</p>
            <p style={{ fontSize: '14px', margin: 0 }}>Try adjusting your search terms.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {records.map(r => (
                <RecordCard key={r._id} record={r} onView={id => navigate(`/portal/records/${id}`)} />
              ))}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: page === 1 ? C.surfAlt : C.surface, color: page === 1 ? C.faint : C.text, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '13px', color: C.muted }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: page === totalPages ? C.surfAlt : C.surface, color: page === totalPages ? C.faint : C.text, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '24px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: C.faint, margin: 0 }}>
          © 2025 Civic Accountability Platform · Open Government Data · All information is published in the public interest
        </p>
      </div>
    </div>
  );
}
