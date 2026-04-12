import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Wallet, Building2, ClipboardCheck, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { vendorService } from '../../services/vendorService';
import { auditService } from '../../services/auditService';
import { publicService } from '../../services/publicService';
import StatusBadge from '../../components/ui/StatusBadge';
import RiskBadge from '../../components/ui/RiskBadge';
import type { Contract, SpendingSummary } from '../../types/index';

const C = { primary: '#1e3a8a', border: '#e2e8f0', bg: '#f8fafc', text: '#0f172a', muted: '#475569', faint: '#94a3b8' };

function StatCard({ icon, value, label, color = C.primary }: { icon: React.ReactNode; value: string; label: string; color?: string }) {
  return (
    <div style={{
      backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '8px',
      padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ color }}>{icon}</div>
      <div style={{ fontSize: '36px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; pct: number }[] }) {
  return (
    <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '0 4px' }}>
      {data.map(({ label, pct }) => (
        <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', backgroundColor: C.primary, borderRadius: '4px 4px 0 0', height: `${pct}%`, minHeight: '4px', transition: 'height 0.3s' }} />
          <span style={{ fontSize: '10px', color: C.muted, fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const PROCUREMENT_METHODS = [
  { label: 'Open Tender', pct: 40, color: C.primary },
  { label: 'Restricted Tender', pct: 25, color: '#0d9488' },
  { label: 'Direct Award', pct: 20, color: '#dc2626' },
  { label: 'Quotation', pct: 15, color: '#94a3b8' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [spending, setSpending] = useState<SpendingSummary[]>([]);
  const [stats, setStats] = useState({ contracts: 0, spend: 0, vendors: 0, audits: 0 });
  const [loading, setLoading] = useState(true);
  const [criticalFindings, setCriticalFindings] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [contractRes, vendorRes, auditRes, spendRes] = await Promise.all([
          contractService.list({ limit: 5, page: 1 }),
          vendorService.list({ limit: 1, page: 1 }),
          auditService.list({ limit: 1, page: 1 }),
          publicService.getSpendingSummaries(),
        ]);
        if (contractRes.success) {
          setContracts(contractRes.data);
          setStats(s => ({ ...s, contracts: contractRes.pagination.total }));
        }
        if (vendorRes.success) setStats(s => ({ ...s, vendors: vendorRes.pagination.total }));
        if (auditRes.success) setStats(s => ({ ...s, audits: auditRes.pagination.total }));
        if (spendRes.success && Array.isArray(spendRes.data)) {
          setSpending(spendRes.data);
          const totalSpend = spendRes.data.reduce((acc: number, s: SpendingSummary) => acc + s.totalSpend, 0);
          setStats(s => ({ ...s, spend: totalSpend }));
        }
        // Count critical audit findings
        const findingsRes = await auditService.list({ status: 'in_progress', limit: 100 });
        if (findingsRes.success) setCriticalFindings(findingsRes.data.filter((a: { riskRating: string }) => a.riskRating === 'critical').length);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatMoney = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };

  const deptBarData = spending.slice(0, 5).map((s: SpendingSummary) => {
    const dept = typeof s.department === 'object' ? s.department : null;
    const label = dept ? dept.name.replace('Ministry of ', '').substring(0, 8) : 'Unknown';
    const max = Math.max(...spending.map((x: SpendingSummary) => x.totalSpend), 1);
    return { label, pct: Math.round((s.totalSpend / max) * 85) };
  });

  const fallbackBars = [
    { label: 'Health', pct: 85 },
    { label: 'Education', pct: 60 },
    { label: 'Transport', pct: 45 },
    { label: 'Defence', pct: 70 },
    { label: 'Finance', pct: 30 },
  ];

  const card = { backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

  return (
    <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.faint, marginBottom: '8px' }}>
          <span>Home</span><span>/</span><span style={{ color: C.primary, fontWeight: 500 }}>Dashboard</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: C.text, margin: '0 0 4px 0' }}>Dashboard</h1>
            <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>Overview of public spending and accountability</p>
          </div>
          <button
            onClick={() => window.print()}
            style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: C.primary, color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}>
            <TrendingUp size={16} /> Export Report
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <StatCard icon={<FileText size={24} />} value={loading ? '…' : String(stats.contracts)} label="Total Contracts" />
        <StatCard icon={<Wallet size={24} />} value={loading ? '…' : formatMoney(stats.spend)} label="Total Spend" />
        <StatCard icon={<Building2 size={24} />} value={loading ? '…' : String(stats.vendors)} label="Active Vendors" />
        <StatCard icon={<ClipboardCheck size={24} />} value={loading ? '…' : String(stats.audits)} label="Open Audits" />
      </div>

      {/* Critical Alert */}
      {criticalFindings > 0 && (
        <div style={{
          backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626',
          padding: '16px', borderRadius: '0 8px 8px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: C.text }}>
              There are {criticalFindings} critical audit finding{criticalFindings !== 1 ? 's' : ''} requiring immediate attention.
            </span>
          </div>
          <button
            onClick={() => navigate('/audits')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View Audits <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Spend by Department */}
        <div style={{ ...card, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.text, margin: 0 }}>Spend by Department</h3>
            <span style={{ fontSize: '11px', color: C.faint, textTransform: 'uppercase', fontWeight: 500 }}>Fiscal Year 2024</span>
          </div>
          <BarChart data={deptBarData.length > 0 ? deptBarData : fallbackBars} />
        </div>

        {/* Procurement Methods Donut */}
        <div style={{ ...card, padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.text, margin: '0 0 24px 0' }}>Procurement Methods</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {/* SVG donut */}
            <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
              <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={C.primary} strokeWidth="3" strokeDasharray="40 100" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#0d9488" strokeWidth="3" strokeDasharray="25 100" strokeDashoffset="-40" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#dc2626" strokeWidth="3.5" strokeDasharray="20 100" strokeDashoffset="-65" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="15 100" strokeDashoffset="-85" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>{stats.contracts || 247}</span>
                <span style={{ fontSize: '10px', color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
              </div>
            </div>
            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {PROCUREMENT_METHODS.map(({ label, pct, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                    <span style={{ color: label === 'Direct Award' ? '#dc2626' : C.muted, fontWeight: label === 'Direct Award' ? 700 : 400 }}>{label}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: label === 'Direct Award' ? '#dc2626' : C.text }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Contracts */}
      <div style={card}>
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.text, margin: 0 }}>Recent Contracts</h3>
          <button
            onClick={() => navigate('/contracts')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: C.primary, fontWeight: 700, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                {['Contract No.', 'Title', 'Vendor', 'Value', 'Status', 'Method', 'Risk'].map(h => (
                  <th key={h} style={{
                    padding: '12px 20px', textAlign: h === 'Value' ? 'right' : 'left',
                    fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.04em', color: C.muted, borderBottom: `1px solid ${C.border}`,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: C.faint }}>Loading…</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: C.faint }}>No contracts found</td></tr>
              ) : (
                contracts.map((c, i) => {
                  const vendor = typeof c.vendor === 'object' ? c.vendor : null;
                  const isDirect = c.procurementMethod === 'direct_award';
                  return (
                    <tr
                      key={c._id}
                      onClick={() => navigate(`/contracts/${c._id}`)}
                      style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc', cursor: 'pointer', transition: 'background-color 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff3ff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#fff' : '#f8fafc')}
                    >
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 500, color: C.muted, fontSize: '13px' }}>{c.contractNumber}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: '14px', color: C.text }}>
                        {isDirect && <AlertTriangle size={14} style={{ color: '#dc2626', marginRight: '6px', verticalAlign: 'middle' }} />}
                        {c.title}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', color: C.muted }}>{vendor?.name ?? '—'}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>
                        ${c.contractValue.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 20px' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', color: isDirect ? '#dc2626' : C.muted, fontWeight: isDirect ? 700 : 400 }}>
                        {c.procurementMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {isDirect ? <RiskBadge level="high" /> : <RiskBadge level="low" />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '12px', color: C.faint, backgroundColor: '#f8fafc',
        }}>
          <span>Showing {contracts.length} of {stats.contracts} contracts</span>
          <button onClick={() => navigate('/contracts')} style={{ color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            View all contracts →
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '32px 0 0', textAlign: 'center', color: C.faint, fontSize: '12px' }}>
        © 2025 VeriTrack • Institutional Transparency Framework • v1.0.0
      </footer>
    </div>
  );
}
