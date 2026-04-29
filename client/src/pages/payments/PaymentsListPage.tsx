import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { contractService } from '../../services/contractService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Alert from '../../components/ui/Alert';
import type { Payment, Contract, Vendor, User, PaymentStatus } from '../../types';

const fmtDate = (s?: string) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtMoney = (n: number, cur = 'USD') =>
  `${cur === 'USD' ? '$' : cur + ' '}${n.toLocaleString()}`;

const ALL_STATUSES: PaymentStatus[] = ['pending', 'processing', 'completed', 'failed'];
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  advance: 'Advance', milestone: 'Milestone', final: 'Final', installment: 'Installment',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '14px', color: '#0f172a', background: '#fff', boxSizing: 'border-box', outline: 'none',
};

interface NewPaymentForm {
  contract: string;
  amount: string;
  paymentType: string;
  referenceNumber: string;
  description: string;
  paymentDate: string;
}

interface FilterState {
  statuses: PaymentStatus[];
  dateFrom: string;
  dateTo: string;
}

export default function PaymentsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'procurement_officer';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [pendingFilters, setPendingFilters] = useState<FilterState>({ statuses: [], dateFrom: '', dateTo: '' });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ statuses: [], dateFrom: '', dateTo: '' });

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [statusModalPayment, setStatusModalPayment] = useState<Payment | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [newStatus, setNewStatus] = useState<PaymentStatus>('pending');
  const [form, setForm] = useState<NewPaymentForm>({
    contract: '', amount: '', paymentType: 'milestone',
    referenceNumber: '', description: '', paymentDate: '',
  });

  useEffect(() => {
    contractService.list({ limit: 100 }).then(r => setContracts(r.data)).catch(() => {});
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit };
      if (appliedFilters.statuses.length === 1) params.status = appliedFilters.statuses[0];

      const res = await paymentService.list(params as Parameters<typeof paymentService.list>[0]);
      let data = res.data;

      // client-side filtering
      if (appliedFilters.statuses.length > 1) {
        data = data.filter(p => appliedFilters.statuses.includes(p.status));
      }
      if (appliedFilters.dateFrom) {
        const from = new Date(appliedFilters.dateFrom).getTime();
        data = data.filter(p => new Date(p.paymentDate).getTime() >= from);
      }
      if (appliedFilters.dateTo) {
        const to = new Date(appliedFilters.dateTo).getTime();
        data = data.filter(p => new Date(p.paymentDate).getTime() <= to);
      }

      // client-side search on referenceNumber / contract title
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(p => {
          const ref = p.referenceNumber?.toLowerCase() ?? '';
          const contract = typeof p.contract === 'object' ? (p.contract as Contract).title?.toLowerCase() ?? '' : '';
          return ref.includes(q) || contract.includes(q);
        });
      }

      // client-side sort
      data = [...data].sort((a, b) => {
        let av: number | string = '';
        let bv: number | string = '';
        if (sortKey === 'amount') { av = a.amount; bv = b.amount; }
        else if (sortKey === 'paymentDate') { av = a.paymentDate; bv = b.paymentDate; }
        else if (sortKey === 'referenceNumber') { av = a.referenceNumber ?? ''; bv = b.referenceNumber ?? ''; }
        else { av = a.createdAt; bv = b.createdAt; }
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });

      setPayments(data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, appliedFilters, sortKey, sortDir]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  useEffect(() => {
    if (!statusModalPayment) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStatusModalPayment(null);
        setStatusUpdating(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [statusModalPayment]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
    setPage(1);
  };

  const handleResetFilters = () => {
    const empty: FilterState = { statuses: [], dateFrom: '', dateTo: '' };
    setPendingFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const handleCreate = async () => {
    if (!form.contract || !form.amount || !form.paymentDate) {
      setCreateError('Contract, Amount, and Payment Date are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await paymentService.create({
        contract: form.contract,
        amount: parseFloat(form.amount),
        paymentType: form.paymentType as Payment['paymentType'],
        referenceNumber: form.referenceNumber || undefined,
        description: form.description || undefined,
        paymentDate: form.paymentDate,
      });
      setDrawerOpen(false);
      setForm({ contract: '', amount: '', paymentType: 'milestone', referenceNumber: '', description: '', paymentDate: '' });
      fetchPayments();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? 'Failed to record payment.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModalPayment) return;
    setStatusUpdating(true);
    setStatusUpdateError('');
    try {
      await paymentService.update(statusModalPayment._id, { status: newStatus });
      setStatusModalPayment(null);
      fetchPayments();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setStatusUpdateError(msg ?? 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <ChevronUp size={12} style={{ color: '#cbd5e1' }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#1e3a8a' }} />
      : <ChevronDown size={12} style={{ color: '#1e3a8a' }} />;
  };

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
        <span style={{ color: '#1e3a8a', fontWeight: 600 }}>Payments</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Payment Records</h1>
          <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0 0' }}>{total} payment records in total</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              placeholder="Search reference, contract..."
              style={{ ...inputStyle, paddingLeft: '36px', width: '320px' }}
            />
          </div>
          {canWrite && (
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              <Plus size={15} /> Record Payment
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

          {/* Status checkboxes */}
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
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>

          {/* Date Range */}
          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Date Range</span>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ ...labelStyle, fontWeight: 400, color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>From</label>
              <input
                style={inputStyle} type="date"
                value={pendingFilters.dateFrom}
                onChange={e => setPendingFilters(f => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontWeight: 400, color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>To</label>
              <input
                style={inputStyle} type="date"
                value={pendingFilters.dateTo}
                onChange={e => setPendingFilters(f => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
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

        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle(true)} onClick={() => handleSort('referenceNumber')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Ref No. <SortIcon k="referenceNumber" /></span>
                  </th>
                  <th style={thStyle()}>Contract</th>
                  <th style={{ ...thStyle(true), textAlign: 'right' }} onClick={() => handleSort('amount')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>Amount <SortIcon k="amount" /></span>
                  </th>
                  <th style={thStyle(true)} onClick={() => handleSort('paymentDate')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Date <SortIcon k="paymentDate" /></span>
                  </th>
                  <th style={thStyle()}>Method</th>
                  <th style={thStyle()}>Status</th>
                  <th style={thStyle()}>Processed By</th>
                  {canWrite && <th style={thStyle()}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canWrite ? 8 : 7} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '48px', border: 'none' }}>
                      Loading...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 8 : 7} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '48px', border: 'none' }}>
                      No payment records found.
                    </td>
                  </tr>
                ) : payments.map((p, i) => {
                  const contract = typeof p.contract === 'object' ? p.contract as Contract : null;
                  const processedBy = typeof p.processedBy === 'object' ? p.processedBy as User : null;
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

                  return (
                    <tr
                      key={p._id}
                      style={{ background: rowBg }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff3ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px', color: '#475569' }}>
                        {p.referenceNumber ?? p._id.slice(-8).toUpperCase()}
                      </td>
                      <td style={tdStyle}>
                        {contract ? (
                          <span
                            onClick={() => navigate(`/contracts/${contract._id}`)}
                            style={{ color: '#1e3a8a', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            {contract.contractNumber ?? contract.title ?? 'View Contract'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#1e3a8a', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(p.amount, p.currency)}
                      </td>
                      <td style={{ ...tdStyle, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDate(p.paymentDate)}</td>
                      <td style={{ ...tdStyle, color: '#475569' }}>
                        {PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}
                      </td>
                      <td style={tdStyle}><StatusBadge status={p.status} /></td>
                      <td style={{ ...tdStyle, color: '#475569' }}>{processedBy?.name ?? '—'}</td>
                      {canWrite && (
                        <td style={tdStyle}>
                          <button
                            onClick={() => { setStatusModalPayment(p); setNewStatus(p.status); setStatusUpdateError(''); }}
                            style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: '#1e3a8a', background: '#eff3ff', border: '1px solid #c7d2fe', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Update Status
                          </button>
                        </td>
                      )}
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
                        <span key={`e-${p}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '13px' }}>…</span>
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
                      >{p}</button>
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

      {/* Update Status Modal */}
      {statusModalPayment && (
        <div onClick={() => { setStatusModalPayment(null); setStatusUpdating(false); }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="status-modal-title" style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '380px', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
            <h3 id="status-modal-title" style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Update Payment Status</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569' }}>
              Ref: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{statusModalPayment.referenceNumber ?? statusModalPayment._id.slice(-8).toUpperCase()}</span>
            </p>
            {statusUpdateError && (
              <div style={{ marginBottom: '12px' }}>
                <Alert type="error" message={statusUpdateError} onClose={() => setStatusUpdateError('')} />
              </div>
            )}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>New Status</label>
              <select style={inputStyle} value={newStatus} onChange={e => setNewStatus(e.target.value as PaymentStatus)}>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStatusModalPayment(null); setStatusUpdating(false); }} style={{ flex: 1, height: '40px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                Cancel
              </button>
              <button onClick={handleUpdateStatus} disabled={statusUpdating} style={{ flex: 1, height: '40px', border: 'none', borderRadius: '6px', background: '#1e3a8a', color: '#fff', cursor: statusUpdating ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, opacity: statusUpdating ? 0.8 : 1 }}>
                {statusUpdating ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setCreateError(''); }}
        title="Record Payment"
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={creating} onClick={handleCreate}>Record</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {createError && <Alert type="error" message={createError} onClose={() => setCreateError('')} />}
          <div>
            <label style={labelStyle}>Contract *</label>
            <select style={inputStyle} value={form.contract} onChange={e => setForm(f => ({ ...f, contract: e.target.value }))}>
              <option value="">Select contract</option>
              {contracts.map(c => <option key={c._id} value={c._id}>{c.contractNumber} — {c.title}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount *</label>
            <input
              style={inputStyle} type="number" min="0"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Type</label>
            <select style={inputStyle} value={form.paymentType} onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))}>
              <option value="advance">Advance</option>
              <option value="milestone">Milestone</option>
              <option value="final">Final</option>
              <option value="installment">Installment</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Reference Number</label>
            <input
              style={inputStyle}
              value={form.referenceNumber}
              onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
              placeholder="REF-XXXX"
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Date *</label>
            <input
              style={inputStyle} type="date"
              value={form.paymentDate}
              onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Payment notes..."
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
