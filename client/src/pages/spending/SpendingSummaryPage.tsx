import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { publicService } from '../../services/publicService';
import { useAuth } from '../../context/AuthContext';
import type { SpendingSummary, Department } from '../../types';
import RiskBadge from '../../components/ui/RiskBadge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

function getDeptName(dept: string | Department | undefined): string {
  if (!dept) return '—';
  if (typeof dept === 'object') return dept.name;
  return String(dept);
}

function riskLevelFromScore(score?: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score === undefined || score === null) return 'low';
  if (score >= 4) return 'critical';
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function yoyChange(current: number, previous?: number): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const dir = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';
  return { pct, dir };
}

const statCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px 24px',
  flex: 1,
  minWidth: '180px',
};

export default function SpendingSummaryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summaries, setSummaries] = useState<SpendingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await publicService.getSpendingSummaries();
      setSummaries(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Failed to load spending summaries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    setSuccessMsg('');
    try {
      await publicService.refreshSpending();
      setSuccessMsg('Spending data refreshed successfully.');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMsg(''), 4000);
      await fetchSummaries();
    } catch {
      setError('Failed to refresh spending data.');
    } finally {
      setRefreshing(false);
    }
  };

  // ─── Derived stats ───────────────────────────────────────────────────────────
  const totalSpend = summaries.reduce((s, r) => s + r.totalSpend, 0);
  const totalContracts = summaries.reduce((s, r) => s + r.totalContracts, 0);
  const deptCount = new Set(summaries.map(r => getDeptName(r.department))).size;
  const scoresWithValue = summaries.filter(r => r.avgRiskScore !== undefined && r.avgRiskScore !== null);
  const avgRisk = scoresWithValue.length > 0
    ? scoresWithValue.reduce((s, r) => s + (r.avgRiskScore ?? 0), 0) / scoresWithValue.length
    : null;

  // For bar chart
  const maxSpend = summaries.length > 0 ? Math.max(...summaries.map(r => r.totalSpend)) : 1;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
        <span style={{ cursor: 'pointer', color: '#1e3a8a' }} onClick={() => navigate('/')}>
          Home
        </span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>Spending Summary</span>
      </nav>

      {/* Alerts */}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      )}
      {successMsg && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Spending Summary</h1>
          <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0' }}>
            Aggregated financial data across all departments
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            loading={refreshing}
            icon={<RefreshCw size={14} />}
          >
            Refresh Data
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 8px' }}>
            Total Spend
          </p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {loading ? '—' : `$${totalSpend.toLocaleString()}`}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>across all departments</p>
        </div>

        <div style={statCardStyle}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 8px' }}>
            Departments Tracked
          </p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {loading ? '—' : deptCount}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>active departments</p>
        </div>

        <div style={statCardStyle}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 8px' }}>
            Total Contracts
          </p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {loading ? '—' : totalContracts}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>contracts recorded</p>
        </div>

        <div style={statCardStyle}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 8px' }}>
            Avg Risk Score
          </p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {loading ? '—' : avgRisk !== null ? avgRisk.toFixed(2) : '—'}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>portfolio average</p>
        </div>
      </div>

      {/* Bar chart */}
      {!loading && summaries.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 24px' }}>Department Spending Overview</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px', overflowX: 'auto', paddingBottom: '8px' }}>
            {summaries.map(s => {
              const pct = maxSpend > 0 ? (s.totalSpend / maxSpend) * 100 : 0;
              const barHeight = Math.max(8, Math.round((pct / 100) * 140));
              return (
                <div
                  key={s._id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '64px', flex: 1 }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    {Math.round(pct)}%
                  </span>
                  <div
                    title={`${getDeptName(s.department)}: ${formatCurrency(s.totalSpend)}`}
                    style={{
                      width: '100%',
                      height: `${barHeight}px`,
                      backgroundColor: '#1e3a8a',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      cursor: 'default',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0d9488'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#1e3a8a'; }}
                  />
                  <span style={{
                    fontSize: '10px',
                    color: '#475569',
                    textAlign: 'center',
                    lineHeight: '1.3',
                    maxWidth: '64px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {getDeptName(s.department)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spending Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Spending by Department</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                {['Department', 'Fiscal Year', 'Total Spend', 'Contracts', 'Avg Risk Score', 'Previous Year', 'YoY Change'].map(col => (
                  <th
                    key={col}
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#475569',
                      textAlign: col === 'Total Spend' || col === 'Previous Year' ? 'right' : col === 'Contracts' ? 'center' : 'left',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    Loading spending data...
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    No spending data available. Click "Refresh Data" to generate summaries.
                  </td>
                </tr>
              ) : (
                summaries.map((s, idx) => {
                  const change = yoyChange(s.totalSpend, s.previousYearSpend);
                  const riskLevel = riskLevelFromScore(s.avgRiskScore);

                  return (
                    <tr
                      key={s._id}
                      style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff3ff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {getDeptName(s.department)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                        FY {s.fiscalYear}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        ${s.totalSpend.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', textAlign: 'center' }}>
                        {s.totalContracts}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {s.avgRiskScore !== undefined && s.avgRiskScore !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RiskBadge level={riskLevel} />
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>({s.avgRiskScore.toFixed(1)})</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {s.previousYearSpend ? `$${s.previousYearSpend.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {change ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {change.dir === 'up' ? (
                              <TrendingUp size={14} style={{ color: '#dc2626' }} />
                            ) : change.dir === 'down' ? (
                              <TrendingDown size={14} style={{ color: '#16a34a' }} />
                            ) : (
                              <Minus size={14} style={{ color: '#94a3b8' }} />
                            )}
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: change.dir === 'up' ? '#dc2626' : change.dir === 'down' ? '#16a34a' : '#94a3b8',
                            }}>
                              {change.dir === 'flat' ? '0%' : `${change.dir === 'up' ? '+' : ''}${change.pct.toFixed(1)}%`}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
