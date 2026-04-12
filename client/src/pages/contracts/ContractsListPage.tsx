import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, X, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { vendorService } from '../../services/vendorService';
import { departmentService } from '../../services/departmentService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Alert from '../../components/ui/Alert';
import type { Contract, Vendor, Department, ProcurementMethod, ContractStatus } from '../../types';

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtMoney = (n: number, currency = 'USD') =>
  `${currency === 'USD' ? '$' : currency + ' '}${n.toLocaleString()}`;

const METHOD_LABELS: Record<ProcurementMethod, string> = {
  open_tender: 'Open Tender',
  restricted_tender: 'Restricted Tender',
  direct_award: 'Direct Award',
  framework_agreement: 'Framework Agreement',
  emergency: 'Emergency',
};

const ALL_STATUSES: ContractStatus[] = ['draft', 'active', 'completed', 'terminated', 'under_review'];
const ALL_METHODS: ProcurementMethod[] = ['open_tender', 'restricted_tender', 'direct_award', 'framework_agreement', 'emergency'];

interface FilterState {
  statuses: ContractStatus[];
  department: string;
  methods: ProcurementMethod[];
}

interface NewContractForm {
  title: string;
  description: string;
  vendor: string;
  department: string;
  procurementMethod: ProcurementMethod | '';
  contractValue: string;
  currency: string;
  startDate: string;
  endDate: string;
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '14px', color: '#0f172a', background: '#fff', boxSizing: 'border-box', outline: 'none',
};

export default function ContractsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'procurement_officer';

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [pendingFilters, setPendingFilters] = useState<FilterState>({ statuses: [], department: '', methods: [] });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ statuses: [], department: '', methods: [] });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState<NewContractForm>({
    title: '', description: '', vendor: '', department: '',
    procurementMethod: '', contractValue: '', currency: 'USD',
    startDate: '', endDate: '',
  });

  useEffect(() => {
    departmentService.list({ limit: 100 }).then(r => setDepartments(r.data)).catch(() => {});
    vendorService.list({ limit: 100 }).then(r => setVendors(r.data)).catch(() => {});
  }, []);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit, search };
      if (appliedFilters.statuses.length === 1) params.status = appliedFilters.statuses[0];
      if (appliedFilters.department) params.department = appliedFilters.department;
      if (appliedFilters.methods.length === 1) params.procurementMethod = appliedFilters.methods[0];

      const res = await contractService.list(params as Parameters<typeof contractService.list>[0]);
      let data = res.data;

      if (appliedFilters.statuses.length > 1) {
        data = data.filter(c => appliedFilters.statuses.includes(c.status));
      }
      if (appliedFilters.methods.length > 1) {
        data = data.filter(c => appliedFilters.methods.includes(c.procurementMethod));
      }

      data = [...data].sort((a, b) => {
        let av: number | string = '';
        let bv: number | string = '';
        if (sortKey === 'contractValue') { av = a.contractValue; bv = b.contractValue; }
        else if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
        else if (sortKey === 'contractNumber') { av = a.contractNumber; bv = b.contractNumber; }
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });

      setContracts(data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setError('Failed to load contracts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, appliedFilters, sortKey, sortDir]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
    setPage(1);
  };

  const handleResetFilters = () => {
    const empty: FilterState = { statuses: [], department: '', methods: [] };
    setPendingFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const removeChip = (type: 'status' | 'department' | 'method', value?: string) => {
    if (type === 'status' && value) {
      const next = { ...appliedFilters, statuses: appliedFilters.statuses.filter(s => s !== value) };
      setAppliedFilters(next); setPendingFilters(next);
    } else if (type === 'department') {
      const next = { ...appliedFilters, department: '' };
      setAppliedFilters(next); setPendingFilters(next);
    } else if (type === 'method' && value) {
      const next = { ...appliedFilters, methods: appliedFilters.methods.filter(m => m !== value) };
      setAppliedFilters(next); setPendingFilters(next);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.vendor || !form.department || !form.procurementMethod || !form.contractValue) {
      setCreateError('Please fill in all required fields.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await contractService.create({
        title: form.title,
        description: form.description || undefined,
        vendor: form.vendor,
        department: form.department,
        procurementMethod: form.procurementMethod as ProcurementMethod,
        contractValue: parseFloat(form.contractValue),
        currency: form.currency || 'USD',
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setDrawerOpen(false);
      setForm({ title: '', description: '', vendor: '', department: '', procurementMethod: '', contractValue: '', currency: 'USD', startDate: '', endDate: '' });
      fetchContracts();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? 'Failed to create contract.');
    } finally {
      setCreating(false);
    }
  };

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <ChevronUp size={12} style={{ color: '#cbd5e1' }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#1e3a8a' }} />
      : <ChevronDown size={12} style={{ color: '#1e3a8a' }} />;
  };

  const activeChips = [
    ...appliedFilters.statuses.map(s => ({ type: 'status' as const, value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })),
    ...(appliedFilters.department
      ? [{ type: 'department' as const, value: appliedFilters.department, label: departments.find(d => d._id === appliedFilters.department)?.name ?? 'Department' }]
      : []),
    ...appliedFilters.methods.map(m => ({ type: 'method' as const, value: m, label: METHOD_LABELS[m] })),
  ];

  const thStyle = (sortable?: boolean): React.CSSProperties => ({
    padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700,
    color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em',
    background: '#f1f5f9', cursor: sortable ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
  });
  const tdStyle: React.CSSProperties = {
    padding: '14px 16px', fontSize: '14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0',
  };

  const paginationPages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: '#1e3a8a', fontWeight: 600 }}>Contracts</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Government Contracts</h1>
          <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0 0' }}>{total} contracts found</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '360px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              placeholder="Search contracts, vendors..."
              style={{ ...inputStyle, paddingLeft: '36px', width: '360px' }}
            />
          </div>
          {canWrite && (
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              <Plus size={15} /> New Contract
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Filter Panel */}
        <div style={{
          width: '260px', flexShrink: 0, background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '12px', padding: '20px', position: 'sticky', top: '24px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>Filters</h3>

          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Status</span>
            {ALL_STATUSES.map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={pendingFilters.statuses.includes(s)}
                  onChange={e => setPendingFilters(f => ({
                    ...f,
                    statuses: e.target.checked ? [...f.statuses, s] : f.statuses.filter(x => x !== s),
                  }))}
                />
                {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Department</span>
            <select
              value={pendingFilters.department}
              onChange={e => setPendingFilters(f => ({ ...f, department: e.target.value }))}
              style={inputStyle}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Procurement Method</span>
            {ALL_METHODS.map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={pendingFilters.methods.includes(m)}
                  onChange={e => setPendingFilters(f => ({
                    ...f,
                    methods: e.target.checked ? [...f.methods, m] : f.methods.filter(x => x !== m),
                  }))}
                />
                {METHOD_LABELS[m]}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleApplyFilters}>
              Apply Filters
            </Button>
            <Button variant="ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Active Filter Chips */}
          {activeChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              {activeChips.map(chip => (
                <span
                  key={`${chip.type}-${chip.value}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: '#eff3ff', color: '#1e3a8a', border: '1px solid #c7d2fe',
                    borderRadius: '9999px', padding: '3px 10px', fontSize: '12px', fontWeight: 500,
                  }}
                >
                  {chip.label}
                  <button
                    onClick={() => removeChip(chip.type, chip.value)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e3a8a', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '2px' }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button
                onClick={handleResetFilters}
                style={{ fontSize: '12px', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle(true)} onClick={() => handleSort('contractNumber')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Contract No. <SortIcon k="contractNumber" /></span>
                  </th>
                  <th style={thStyle()}>Title</th>
                  <th style={thStyle()}>Vendor</th>
                  <th style={thStyle()}>Department</th>
                  <th style={{ ...thStyle(true), textAlign: 'right' }} onClick={() => handleSort('contractValue')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>Value <SortIcon k="contractValue" /></span>
                  </th>
                  <th style={thStyle()}>Method</th>
                  <th style={thStyle()}>Status</th>
                  <th style={thStyle(true)} onClick={() => handleSort('createdAt')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Created <SortIcon k="createdAt" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '48px', border: 'none' }}>
                      Loading...
                    </td>
                  </tr>
                ) : contracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '48px', border: 'none' }}>
                      No contracts found.
                    </td>
                  </tr>
                ) : contracts.map((c, i) => {
                  const vendor = typeof c.vendor === 'object' ? c.vendor : null;
                  const dept = typeof c.department === 'object' ? c.department : null;
                  const isDirectAward = c.procurementMethod === 'direct_award';
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  return (
                    <tr
                      key={c._id}
                      style={{ background: rowBg }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff3ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={tdStyle}>
                        <span
                          onClick={() => navigate(`/contracts/${c._id}`)}
                          style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e3a8a', cursor: 'pointer', fontSize: '13px' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {c.contractNumber}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '200px' }}>
                        <span style={{ fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#475569' }}>{vendor?.name ?? '—'}</td>
                      <td style={{ ...tdStyle, color: '#475569' }}>{dept?.name ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(c.contractValue, c.currency)}
                      </td>
                      <td style={tdStyle}>
                        {isDirectAward ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>
                            <AlertTriangle size={13} /> Direct Award
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#475569' }}>{METHOD_LABELS[c.procurementMethod]}</span>
                        )}
                      </td>
                      <td style={tdStyle}><StatusBadge status={c.status} /></td>
                      <td style={{ ...tdStyle, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  {paginationPages.map((p, idx) => (
                    <>
                      {idx > 0 && paginationPages[idx - 1] !== p - 1 && (
                        <span key={`ellipsis-${p}`} style={{ padding: '0 4px', color: '#94a3b8', lineHeight: '30px', fontSize: '13px' }}>…</span>
                      )}
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          width: '30px', height: '30px', borderRadius: '6px',
                          border: p === page ? 'none' : '1px solid #e2e8f0',
                          background: p === page ? '#1e3a8a' : '#fff',
                          color: p === page ? '#fff' : '#374151',
                          cursor: 'pointer', fontSize: '13px', fontWeight: p === page ? 700 : 400,
                        }}
                      >
                        {p}
                      </button>
                    </>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Contract Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setCreateError(''); }}
        title="New Contract"
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={creating} onClick={handleCreate}>Create Contract</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {createError && (
            <Alert type="error" message={createError} onClose={() => setCreateError('')} />
          )}
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Contract title" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Contract description"
            />
          </div>
          <div>
            <label style={labelStyle}>Vendor *</label>
            <select style={inputStyle} value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}>
              <option value="">Select vendor</option>
              {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Department *</label>
            <select style={inputStyle} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Procurement Method *</label>
            <select style={inputStyle} value={form.procurementMethod} onChange={e => setForm(f => ({ ...f, procurementMethod: e.target.value as ProcurementMethod }))}>
              <option value="">Select method</option>
              {ALL_METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Contract Value ($) *</label>
              <input
                style={inputStyle} type="number" min="0"
                value={form.contractValue}
                onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <input
                style={inputStyle}
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                placeholder="USD"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input style={inputStyle} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input style={inputStyle} type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
