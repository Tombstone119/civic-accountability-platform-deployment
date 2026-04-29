import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Ban, CheckCircle, XCircle, AlertTriangle, Pencil, Trash2, Upload } from 'lucide-react';
import { vendorService } from '../../services/vendorService';
import { contractService } from '../../services/contractService';
import { useAuth } from '../../context/AuthContext';
import type { Vendor, VendorDocument, Contract } from '../../types';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const isExpired = (d: string) => new Date(d) < new Date();

const docTypeLabel: Record<string, string> = {
  tax_clearance: 'Tax Clearance',
  business_license: 'Business License',
  registration_certificate: 'Registration Certificate',
  insurance: 'Insurance',
  other: 'Other',
};

const contractStatusStyle: Record<string, { bg: string; text: string; border: string }> = {
  active:       { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
  draft:        { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' },
  completed:    { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },
  terminated:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  under_review: { bg: '#fefce8', text: '#ca8a04', border: '#fde047' },
};

function StatusBadge({ status }: { status: string }) {
  const s = contractStatusStyle[status] ?? contractStatusStyle.draft;
  return (
    <span style={{
      padding: '2px 10px', fontSize: '10px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em', borderRadius: '4px',
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function DocStatusBadge({ expired, verified }: { expired: boolean; verified: boolean }) {
  if (expired) return (
    <span style={{
      padding: '2px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      borderRadius: '4px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
    }}>Expired</span>
  );
  if (verified) return (
    <span style={{
      padding: '2px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      borderRadius: '4px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac',
    }}>Verified</span>
  );
  return (
    <span style={{
      padding: '2px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      borderRadius: '4px', background: '#fefce8', color: '#ca8a04', border: '1px solid #fde047',
    }}>Pending</span>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'procurement_officer';

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit drawer state
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Vendor>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Upload document drawer
  const [showDocDrawer, setShowDocDrawer] = useState(false);
  const [docForm, setDocForm] = useState<Partial<VendorDocument>>({});
  const [docSaving, setDocSaving] = useState(false);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      vendorService.get(id),
      vendorService.getDocuments(id),
      contractService.list({ limit: 50 }),
    ]).then(([vRes, dRes, cRes]) => {
      if (vRes.success && vRes.data) setVendor(vRes.data);
      else setError('Vendor not found.');
      if (dRes.success && Array.isArray(dRes.data)) setDocuments(dRes.data);
      if (cRes.success && Array.isArray(cRes.data)) {
        // filter contracts for this vendor
        setContracts(cRes.data.filter(c => {
          const v = typeof c.vendor === 'string' ? c.vendor : (c.vendor as Vendor)?._id;
          return v === id;
        }));
      }
    }).catch(() => setError('Failed to load vendor.')).finally(() => setLoading(false));
  }, [id]);

  const handleBlacklist = async () => {
    if (!vendor || !id) return;
    const reason = window.prompt('Enter blacklist reason:');
    if (!reason) return;
    const res = await vendorService.blacklistVendor(id, reason);
    if (res.success && res.data) setVendor(res.data);
  };

  const handleRemoveBlacklist = async () => {
    if (!id) return;
    const res = await vendorService.removeFromBlacklist(id);
    if (res.success && res.data) setVendor(res.data);
  };

  const handleEdit = () => {
    if (!vendor) return;
    setEditForm({ name: vendor.name, email: vendor.email, phone: vendor.phone, address: vendor.address, status: vendor.status });
    setShowEditDrawer(true);
  };

  const handleEditSave = async () => {
    if (!id) return;
    setEditSaving(true);
    const res = await vendorService.update(id, editForm);
    if (res.success && res.data) { setVendor(res.data); setShowEditDrawer(false); }
    setEditSaving(false);
  };

  const handleDocUpload = async () => {
    if (!id) return;
    setDocSaving(true);
    const res = await vendorService.addDocument(id, docForm);
    if (res.success && res.data) {
      setDocuments(prev => [...prev, res.data!]);
      setShowDocDrawer(false);
      setDocForm({});
    }
    setDocSaving(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const res = await vendorService.delete(id);
    if (res.success) navigate('/vendors');
    setDeleting(false);
  };

  const activeDocCount = documents.filter(d => d.isVerified && !isExpired(d.expiryDate)).length;
  const perfScore = vendor?.performanceScore ?? 0;
  const perfColor = perfScore >= 70 ? '#16a34a' : perfScore >= 50 ? '#ca8a04' : '#dc2626';

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '38px', padding: '0 12px', border: '1px solid #e2e8f0',
    borderRadius: '6px', fontSize: '14px', color: '#0f172a', outline: 'none',
    backgroundColor: '#fff', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#94a3b8', fontSize: '14px' }}>
      Loading…
    </div>
  );

  if (error || !vendor) return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626', fontSize: '14px' }}>{error || 'Vendor not found.'}</div>
  );

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
        <Link to="/dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={14} />
        <Link to="/vendors" style={{ color: '#64748b', textDecoration: 'none' }}>Vendors</Link>
        <ChevronRight size={14} />
        <span style={{ color: '#1e3a8a', fontWeight: 500 }}>{vendor.name}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{vendor.name}</h2>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{vendor.registrationNumber}</span>
        </div>

        {vendor.isBlacklisted && (
          <div style={{
            marginTop: '16px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px',
          }}>
            <Ban size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', margin: '0 0 4px 0' }}>
                This vendor has been blacklisted
              </p>
              {vendor.blacklistReason && (
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  Reason: {vendor.blacklistReason}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Contracts', value: String(contracts.length), color: '#1e3a8a' },
          { label: 'Total Value', value: fmtCurrency(vendor.totalContractsValue || 0), color: '#1e3a8a' },
          { label: 'Performance Score', value: `${perfScore} / 100`, color: perfColor },
          { label: 'Active Documents', value: String(activeDocCount), color: activeDocCount === 0 ? '#94a3b8' : '#1e3a8a' },
        ].map(c => (
          <div key={c.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>
              {c.label}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: c.color, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Vendor Information */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '32px', overflow: 'hidden' }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Vendor Information</h3>
          {vendor.isBlacklisted && (
            <span style={{
              padding: '3px 12px', background: '#fef2f2', color: '#dc2626', fontSize: '10px',
              fontWeight: 700, textTransform: 'uppercase', borderRadius: '9999px', border: '1px solid #fecaca',
            }}>Blacklisted</span>
          )}
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 48px' }}>
            {[
              { label: 'Name', value: vendor.name },
              { label: 'Email', value: vendor.email, isEmail: true },
              { label: 'Phone', value: vendor.phone || '—' },
              { label: 'Address', value: vendor.address || '—' },
              { label: 'Registration No.', value: vendor.registrationNumber },
              { label: 'Status', value: vendor.status.replace(/_/g, ' ') },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                  {f.label}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: f.isEmail ? '#1e3a8a' : '#0f172a', margin: 0 }}>
                  {f.value}
                </p>
              </div>
            ))}

            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                Is Active
              </p>
              {vendor.status === 'active'
                ? <CheckCircle size={18} style={{ color: '#16a34a' }} />
                : <XCircle size={18} style={{ color: '#dc2626' }} />}
            </div>

            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                Performance Score
              </p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: perfColor, margin: 0 }}>
                {perfScore} / 100
              </p>
            </div>

            {vendor.isBlacklisted && vendor.blacklistReason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                  Blacklist Reason
                </p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#991b1b', fontStyle: 'italic', margin: 0 }}>
                  {vendor.blacklistReason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Documents */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '32px', overflow: 'hidden' }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Compliance Documents</h3>
          {canEdit && (
            <button
              onClick={() => { setDocForm({}); setShowDocDrawer(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', border: '1px solid #1e3a8a', borderRadius: '6px',
                background: 'transparent', color: '#1e3a8a', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Upload size={13} /> Upload Document
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Document Type', 'Doc No.', 'Issue Date', 'Expiry Date', 'Verified', 'Status'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.04em', color: '#475569', textAlign: i >= 4 ? 'center' : 'left',
                    borderBottom: '1px solid #e2e8f0',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    No documents uploaded.
                  </td>
                </tr>
              ) : documents.map((doc, i) => {
                const expired = isExpired(doc.expiryDate);
                return (
                  <tr key={doc._id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #f1f5f9' }}>
                      {docTypeLabel[doc.documentType] ?? doc.documentType}
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: '14px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {doc.documentNumber}
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: '14px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {fmtDate(doc.issueDate)}
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: '14px', color: expired ? '#dc2626' : '#475569', fontWeight: expired ? 500 : 400, borderBottom: '1px solid #f1f5f9' }}>
                      {fmtDate(doc.expiryDate)}
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      {doc.isVerified
                        ? <CheckCircle size={16} style={{ color: '#16a34a', margin: '0 auto' }} />
                        : <XCircle size={16} style={{ color: '#dc2626', margin: '0 auto' }} />}
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <DocStatusBadge expired={expired} verified={doc.isVerified} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract History */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '40px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Contract History</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Contract No.', 'Title', 'Value', 'Method', 'Status', 'Date'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.04em', color: '#475569', borderBottom: '1px solid #e2e8f0',
                    textAlign: i === 5 ? 'right' : 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    No contracts found.
                  </td>
                </tr>
              ) : contracts.map((c, i) => (
                <tr key={c._id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9' }}>
                    <Link to={`/contracts/${c._id}`} style={{
                      fontSize: '14px', fontWeight: 700, color: '#1e3a8a', textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                    }}>{c.contractNumber}</Link>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' }}>
                    {c.title}
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                    {fmtCurrency(c.contractValue)}
                  </td>
                  <td style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9' }}>
                    {c.procurementMethod === 'direct_award' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', background: '#fff7ed', color: '#ea580c',
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        borderRadius: '4px', border: '1px solid #fed7aa',
                      }}>
                        <AlertTriangle size={11} /> Direct Award
                      </span>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#475569' }}>
                        {c.procurementMethod.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9' }}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748b', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                    {fmtDate(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <button
            onClick={handleEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 24px', border: '2px solid #1e3a8a', borderRadius: '8px',
              background: 'transparent', color: '#1e3a8a', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#eff3ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Pencil size={16} /> Edit Vendor
          </button>

          {vendor.isBlacklisted ? (
            <button
              onClick={handleRemoveBlacklist}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', border: '2px solid #16a34a', borderRadius: '8px',
                background: 'transparent', color: '#16a34a', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <CheckCircle size={16} /> Remove from Blacklist
            </button>
          ) : (
            <button
              onClick={handleBlacklist}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', border: '2px solid #ea580c', borderRadius: '8px',
                background: 'transparent', color: '#ea580c', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fff7ed')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Ban size={16} /> Blacklist Vendor
            </button>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 24px', border: '2px solid #dc2626', borderRadius: '8px',
              background: 'transparent', color: '#dc2626', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={16} /> Delete Vendor
          </button>
        </div>
      )}

      {/* Edit Vendor Drawer */}
      {showEditDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowEditDrawer(false)} />
          <div style={{
            width: '480px', background: '#fff', height: '100%', overflowY: 'auto',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Edit Vendor</h3>
              <button onClick={() => setShowEditDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {([
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Phone', type: 'text' },
                { key: 'address', label: 'Address', type: 'text' },
              ] as const).map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type} value={String(editForm[f.key] ?? '')}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={editForm.status ?? 'active'}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Vendor['status'] }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {['active', 'inactive', 'blacklisted', 'under_review'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowEditDrawer(false)} style={{
                flex: 1, height: '40px', border: '1px solid #e2e8f0', borderRadius: '6px',
                background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#475569',
              }}>Cancel</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{
                flex: 1, height: '40px', border: 'none', borderRadius: '6px',
                background: '#1e3a8a', color: '#fff', cursor: editSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600, opacity: editSaving ? 0.8 : 1,
              }}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Drawer */}
      {showDocDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowDocDrawer(false)} />
          <div style={{
            width: '480px', background: '#fff', height: '100%', overflowY: 'auto',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Upload Document</h3>
              <button onClick={() => setShowDocDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div>
                <label style={labelStyle}>Document Type</label>
                <select
                  value={docForm.documentType ?? ''}
                  onChange={e => setDocForm(p => ({ ...p, documentType: e.target.value as VendorDocument['documentType'] }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Select type…</option>
                  {Object.entries(docTypeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Document Number</label>
                <input type="text" value={docForm.documentNumber ?? ''}
                  onChange={e => setDocForm(p => ({ ...p, documentNumber: e.target.value }))}
                  style={inputStyle} placeholder="e.g. TC-2024-001" />
              </div>
              <div>
                <label style={labelStyle}>Issue Date</label>
                <input type="date" value={docForm.issueDate?.slice(0, 10) ?? ''}
                  onChange={e => setDocForm(p => ({ ...p, issueDate: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input type="date" value={docForm.expiryDate?.slice(0, 10) ?? ''}
                  onChange={e => setDocForm(p => ({ ...p, expiryDate: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDocDrawer(false)} style={{
                flex: 1, height: '40px', border: '1px solid #e2e8f0', borderRadius: '6px',
                background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#475569',
              }}>Cancel</button>
              <button onClick={handleDocUpload} disabled={docSaving} style={{
                flex: 1, height: '40px', border: 'none', borderRadius: '6px',
                background: '#1e3a8a', color: '#fff', cursor: docSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600, opacity: docSaving ? 0.8 : 1,
              }}>{docSaving ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}>
          <div style={{
            background: '#fff', borderRadius: '8px', padding: '32px',
            width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Delete Vendor</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569' }}>
              Are you sure you want to delete <strong>{vendor.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{
                flex: 1, height: '40px', border: '1px solid #e2e8f0', borderRadius: '6px',
                background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#475569',
              }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, height: '40px', border: 'none', borderRadius: '6px',
                background: '#dc2626', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600, opacity: deleting ? 0.8 : 1,
              }}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
