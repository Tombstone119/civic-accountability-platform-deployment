import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { vendorService } from '../../services/vendorService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Alert from '../../components/ui/Alert';
import type { Vendor } from '../../types';

const fmtMoney = (n: number) => `$${n.toLocaleString()}`;

const CATEGORIES = ['IT & Technology', 'Medical', 'Construction', 'Education', 'Security', 'Media', 'Finance', 'Other'];

const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '14px', color: '#0f172a', background: '#fff', boxSizing: 'border-box', outline: 'none',
};

interface NewVendorForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  registrationNumber: string;
  category: string;
  performanceScore: string;
  isActive: boolean;
}

type StatusFilter = 'all' | 'active' | 'inactive';
type BlacklistFilter = 'all' | 'blacklisted' | 'not_blacklisted';

export default function VendorsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'procurement_officer';

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [blacklistFilter, setBlacklistFilter] = useState<BlacklistFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [pendingStatus, setPendingStatus] = useState<StatusFilter>('all');
  const [pendingBlacklist, setPendingBlacklist] = useState<BlacklistFilter>('all');
  const [pendingCategory, setPendingCategory] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState<NewVendorForm>({
    name: '', email: '', phone: '', address: '',
    registrationNumber: '', category: '', performanceScore: '', isActive: true,
  });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit, search };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (blacklistFilter === 'blacklisted') params.isBlacklisted = true;
      if (blacklistFilter === 'not_blacklisted') params.isBlacklisted = false;

      const res = await vendorService.list(params as Parameters<typeof vendorService.list>[0]);
      let data = res.data;

      // Category filter (client-side — not a server param)
      if (categoryFilter) {
        // vendors don't have a category field in the type, but if the server populates it we filter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data = data.filter((v: any) => v.category === categoryFilter);
      }

      setVendors(data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setError('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, blacklistFilter, categoryFilter]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleApplyFilters = () => {
    setStatusFilter(pendingStatus);
    setBlacklistFilter(pendingBlacklist);
    setCategoryFilter(pendingCategory);
    setPage(1);
  };

  const handleResetFilters = () => {
    setPendingStatus('all');
    setPendingBlacklist('all');
    setPendingCategory('');
    setStatusFilter('all');
    setBlacklistFilter('all');
    setCategoryFilter('');
    setPage(1);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.registrationNumber) {
      setCreateError('Name, Email, and Registration Number are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        registrationNumber: form.registrationNumber,
        status: form.isActive ? 'active' : 'inactive',
      };
      if (form.phone) payload.phone = form.phone;
      if (form.address) payload.address = form.address;
      if (form.performanceScore) payload.performanceScore = parseFloat(form.performanceScore);
      if (form.category) payload.category = form.category;

      await vendorService.create(payload as Partial<Vendor>);
      setDrawerOpen(false);
      setForm({ name: '', email: '', phone: '', address: '', registrationNumber: '', category: '', performanceScore: '', isActive: true });
      fetchVendors();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? 'Failed to register vendor.');
    } finally {
      setCreating(false);
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return '#94a3b8';
    if (score >= 70) return '#16a34a';
    if (score >= 50) return '#d97706';
    return '#dc2626';
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700,
    color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em',
    background: '#f1f5f9', whiteSpace: 'nowrap',
  };
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
        <span style={{ color: '#1e3a8a', fontWeight: 600 }}>Vendors</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Vendor Registry</h1>
          <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0 0' }}>{total} registered vendors</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              placeholder="Search vendors..."
              style={{ ...inputStyle, paddingLeft: '36px', width: '320px' }}
            />
          </div>
          {canWrite && (
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              <Plus size={15} /> Register Vendor
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

          {/* Status */}
          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Status</span>
            {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                <input type="radio" name="vendorStatus" checked={pendingStatus === s} onChange={() => setPendingStatus(s)} />
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>

          {/* Blacklist Status */}
          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Blacklist Status</span>
            {[
              { value: 'all' as BlacklistFilter, label: 'All' },
              { value: 'blacklisted' as BlacklistFilter, label: 'Blacklisted Only' },
              { value: 'not_blacklisted' as BlacklistFilter, label: 'Not Blacklisted' },
            ].map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                <input type="radio" name="blacklistStatus" checked={pendingBlacklist === opt.value} onChange={() => setPendingBlacklist(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Category</span>
            <select value={pendingCategory} onChange={e => setPendingCategory(e.target.value)} style={inputStyle}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Reg. No.</th>
                  <th style={thStyle}>Category</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Contracts</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Value</th>
                  <th style={thStyle}>Performance</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Blacklisted</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '48px', border: 'none' }}>
                      Loading...
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '48px', border: 'none' }}>
                      No vendors found.
                    </td>
                  </tr>
                ) : vendors.map((v, i) => {
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const category = (v as any).category as string | undefined;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const contractCount = (v as any).contractCount as number | undefined;
                  const score = v.performanceScore;
                  const scoreColor = getScoreColor(score);

                  return (
                    <tr
                      key={v._id}
                      style={{ background: rowBg }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff3ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={tdStyle}>
                        <span
                          onClick={() => navigate(`/vendors/${v._id}`)}
                          style={{ fontWeight: 600, color: '#1e3a8a', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {v.name}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px', color: '#475569' }}>
                        {v.registrationNumber}
                      </td>
                      <td style={{ ...tdStyle, color: '#475569' }}>{category ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#475569' }}>{contractCount ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(v.totalContractsValue)}
                      </td>
                      <td style={tdStyle}>
                        {score !== undefined && score !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '9999px', height: '6px', overflow: 'hidden', minWidth: '60px' }}>
                              <div style={{ width: `${Math.min(100, score)}%`, background: scoreColor, height: '100%', borderRadius: '9999px' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor, minWidth: '28px' }}>{score}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {v.isBlacklisted ? (
                          <StatusBadge status="blacklisted" />
                        ) : (
                          <StatusBadge status={v.status} />
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {v.isBlacklisted ? (
                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '16px' }}>✓</span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
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

      {/* Register Vendor Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setCreateError(''); }}
        title="Register Vendor"
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={creating} onClick={handleCreate}>Register</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {createError && <Alert type="error" message={createError} onClose={() => setCreateError('')} />}
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vendor name" />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Registration Number *</label>
            <input style={inputStyle} value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} placeholder="REG-XXXXX" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Business address" />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Performance Score (0–100)</label>
            <input
              style={inputStyle} type="number" min="0" max="100"
              value={form.performanceScore}
              onChange={e => setForm(f => ({ ...f, performanceScore: e.target.value }))}
              placeholder="e.g. 85"
            />
          </div>
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              />
              Active vendor
            </label>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
