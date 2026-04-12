import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react';
import { auditService } from '../../services/auditService';
import { contractService } from '../../services/contractService';
import { vendorService } from '../../services/vendorService';
import { useAuth } from '../../context/AuthContext';
import type { Audit, Contract, Vendor, AuditType, AuditStatus, RiskRating } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import RiskBadge from '../../components/ui/RiskBadge';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Alert from '../../components/ui/Alert';

const AUDIT_TYPES: AuditType[] = ['routine', 'forensic', 'compliance', 'performance'];
const AUDIT_STATUSES: AuditStatus[] = ['planned', 'in_progress', 'completed', 'cancelled'];
const RISK_RATINGS: RiskRating[] = ['critical', 'high', 'medium', 'low'];

const riskDotColor: Record<RiskRating, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
};

interface FormState {
  title: string;
  auditType: AuditType;
  contract: string;
  vendor: string;
  startDate: string;
  summary: string;
  riskRating: RiskRating;
}

const defaultForm: FormState = {
  title: '',
  auditType: 'routine',
  contract: '',
  vendor: '',
  startDate: '',
  summary: '',
  riskRating: 'low',
};

export default function AuditsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [audits, setAudits] = useState<Audit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<AuditType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<AuditStatus[]>([]);
  const [selectedRisks, setSelectedRisks] = useState<RiskRating[]>([]);
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'compliant' | 'non_compliant'>('all');

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  // Data for selects
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      if (selectedTypes.length === 1) params.auditType = selectedTypes[0];
      if (selectedStatuses.length === 1) params.status = selectedStatuses[0];
      if (selectedRisks.length === 1) params.riskRating = selectedRisks[0];

      const res = await auditService.list(params as Parameters<typeof auditService.list>[0]);
      let data = res.data;

      // client-side filter for multi-select and compliance
      if (selectedTypes.length > 1) data = data.filter(a => selectedTypes.includes(a.auditType));
      if (selectedStatuses.length > 1) data = data.filter(a => selectedStatuses.includes(a.status));
      if (selectedRisks.length > 1) data = data.filter(a => selectedRisks.includes(a.riskRating));
      if (complianceFilter === 'compliant') data = data.filter(a => a.complianceOutcome === 'compliant');
      if (complianceFilter === 'non_compliant') data = data.filter(a => a.complianceOutcome === 'non_compliant');

      setAudits(data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setError('Failed to load audits.');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedTypes, selectedStatuses, selectedRisks, complianceFilter]);

  useEffect(() => { fetchAudits(); }, [fetchAudits]);

  useEffect(() => {
    contractService.list({ limit: 100 }).then(r => setContracts(r.data)).catch(() => {});
    vendorService.list({ limit: 100 }).then(r => setVendors(r.data)).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const toggleType = (t: AuditType) =>
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const toggleStatus = (s: AuditStatus) =>
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleRisk = (r: RiskRating) =>
    setSelectedRisks(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const handleApplyFilters = () => { setPage(1); fetchAudits(); };
  const handleResetFilters = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedRisks([]);
    setComplianceFilter('all');
    setPage(1);
  };

  const handleOpenDrawer = () => {
    setForm(defaultForm);
    setDrawerOpen(true);
  };

  const handleCreate = async () => {
    if (!form.title || !form.startDate) return;
    setSubmitting(true);
    try {
      const payload: Partial<Audit> = {
        title: form.title,
        auditType: form.auditType,
        startDate: form.startDate,
        riskRating: form.riskRating,
        summary: form.summary || undefined,
        contract: form.contract || undefined,
        vendor: form.vendor || undefined,
      };
      await auditService.create(payload);
      setDrawerOpen(false);
      setSuccessMsg('Audit created successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchAudits();
    } catch {
      setError('Failed to create audit.');
    } finally {
      setSubmitting(false);
    }
  };

  const getContractRef = (audit: Audit): string => {
    if (!audit.contract) return '—';
    if (typeof audit.contract === 'object') return audit.contract.contractNumber;
    return String(audit.contract).slice(-8);
  };

  const getVendorName = (audit: Audit): string => {
    if (!audit.vendor) return '';
    if (typeof audit.vendor === 'object') return audit.vendor.name;
    return '';
  };

  const getAuditorName = (audit: Audit): string => {
    if (audit.auditor !== null && typeof audit.auditor === 'object') return audit.auditor.name;
    return '—';
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const canCreate = user?.role === 'admin' || user?.role === 'auditor';

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
        <span
          style={{ cursor: 'pointer', color: '#1e3a8a' }}
          onClick={() => navigate('/')}
        >
          Home
        </span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>Audits</span>
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Audit Reports</h1>
          <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0' }}>
            {loading ? 'Loading...' : `${total} audit record${total !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search audits..."
                style={{ ...inputStyle, paddingLeft: '32px', width: '220px', height: '36px' }}
              />
            </div>
            <Button type="submit" variant="ghost" size="sm">Search</Button>
          </form>
          {canCreate && (
            <Button variant="primary" size="md" onClick={handleOpenDrawer} icon={<Plus size={14} />}>
              New Audit
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Filter Panel */}
        <div style={{
          width: '260px',
          flexShrink: 0,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          position: 'sticky',
          top: '24px',
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Filters
          </h3>

          {/* Audit Type */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              Audit Type
            </p>
            {AUDIT_TYPES.map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(t)}
                  onChange={() => toggleType(t)}
                  style={{ accentColor: '#1e3a8a', width: '14px', height: '14px' }}
                />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>

          {/* Status */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              Status
            </p>
            {AUDIT_STATUSES.map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(s)}
                  onChange={() => toggleStatus(s)}
                  style={{ accentColor: '#1e3a8a', width: '14px', height: '14px' }}
                />
                {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </label>
            ))}
          </div>

          {/* Risk Rating */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              Risk Rating
            </p>
            {RISK_RATINGS.map(r => (
              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={selectedRisks.includes(r)}
                  onChange={() => toggleRisk(r)}
                  style={{ accentColor: '#1e3a8a', width: '14px', height: '14px' }}
                />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: riskDotColor[r], flexShrink: 0 }} />
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </label>
            ))}
          </div>

          {/* Compliance */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              Compliance
            </p>
            {(['all', 'compliant', 'non_compliant'] as const).map(c => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}>
                <input
                  type="radio"
                  name="compliance"
                  checked={complianceFilter === c}
                  onChange={() => setComplianceFilter(c)}
                  style={{ accentColor: '#1e3a8a', width: '14px', height: '14px' }}
                />
                {c === 'all' ? 'All' : c === 'compliant' ? 'Compliant' : 'Non-Compliant'}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={handleApplyFilters} style={{ width: '100%', justifyContent: 'center' }}>
              Apply Filters
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetFilters} style={{ width: '100%', justifyContent: 'center' }}>
              Reset
            </Button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Active filter chips */}
            {(selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedRisks.length > 0 || complianceFilter !== 'all') && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '4px' }}>Active:</span>
                {selectedTypes.map(t => (
                  <span key={t} style={{ backgroundColor: '#eff3ff', color: '#1e3a8a', borderRadius: '9999px', border: '1px solid rgba(30,58,138,0.1)', fontSize: '12px', padding: '2px 10px', fontWeight: 500 }}>
                    {t}
                  </span>
                ))}
                {selectedStatuses.map(s => (
                  <span key={s} style={{ backgroundColor: '#eff3ff', color: '#1e3a8a', borderRadius: '9999px', border: '1px solid rgba(30,58,138,0.1)', fontSize: '12px', padding: '2px 10px', fontWeight: 500 }}>
                    {s}
                  </span>
                ))}
                {selectedRisks.map(r => (
                  <span key={r} style={{ backgroundColor: '#eff3ff', color: '#1e3a8a', borderRadius: '9999px', border: '1px solid rgba(30,58,138,0.1)', fontSize: '12px', padding: '2px 10px', fontWeight: 500 }}>
                    {r}
                  </span>
                ))}
                {complianceFilter !== 'all' && (
                  <span style={{ backgroundColor: '#eff3ff', color: '#1e3a8a', borderRadius: '9999px', border: '1px solid rgba(30,58,138,0.1)', fontSize: '12px', padding: '2px 10px', fontWeight: 500 }}>
                    {complianceFilter}
                  </span>
                )}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    {['ID', 'Contract / Vendor', 'Auditor', 'Type', 'Status', 'Risk Rating', 'Compliant', 'Start Date'].map(col => (
                      <th key={col} style={{
                        padding: '10px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#475569',
                        textAlign: col === 'Risk Rating' || col === 'Compliant' ? 'center' : 'left',
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                        Loading audits...
                      </td>
                    </tr>
                  ) : audits.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                        No audits found.
                      </td>
                    </tr>
                  ) : (
                    audits.map((audit, idx) => {
                      const contractRef = getContractRef(audit);
                      const vendorName = getVendorName(audit);
                      const auditorName = getAuditorName(audit);
                      const isCompliant = audit.complianceOutcome === 'compliant';
                      const isNonCompliant = audit.complianceOutcome === 'non_compliant';

                      return (
                        <tr
                          key={audit._id}
                          onClick={() => navigate(`/audits/${audit._id}`)}
                          style={{
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff3ff')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc')}
                        >
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                            {audit.auditNumber}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a' }}>{contractRef}</div>
                            {vendorName && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{vendorName}</div>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {auditorName}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                            {audit.auditType}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <StatusBadge status={audit.status} />
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <RiskBadge level={audit.riskRating} />
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {isCompliant ? (
                              <Check size={16} style={{ color: '#16a34a', display: 'inline-block' }} />
                            ) : isNonCompliant ? (
                              <XIcon size={16} style={{ color: '#dc2626', display: 'inline-block' }} />
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '14px' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                            {formatDate(audit.startDate)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  Page {page} of {totalPages} — {total} total records
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    icon={<ChevronLeft size={14} />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Audit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Audit"
        width={480}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleCreate} loading={submitting}>
              Create Audit
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Title <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Audit title"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Audit Type</label>
            <select
              value={form.auditType}
              onChange={e => setForm(f => ({ ...f, auditType: e.target.value as AuditType }))}
              style={inputStyle}
            >
              {AUDIT_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Contract</label>
            <select
              value={form.contract}
              onChange={e => setForm(f => ({ ...f, contract: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— Select contract —</option>
              {contracts.map(c => (
                <option key={c._id} value={c._id}>{c.contractNumber} — {c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Vendor (optional)</label>
            <select
              value={form.vendor}
              onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— Select vendor —</option>
              {vendors.map(v => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Start Date <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Risk Rating</label>
            <select
              value={form.riskRating}
              onChange={e => setForm(f => ({ ...f, riskRating: e.target.value as RiskRating }))}
              style={inputStyle}
            >
              {RISK_RATINGS.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Summary</label>
            <textarea
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Brief audit summary..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
