import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, MoreVertical, Download, Plus } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { paymentService } from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Alert from '../../components/ui/Alert';
import type { Contract, ContractItem, Payment, Vendor, Department, User } from '../../types';

const fmtDate = (s?: string) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtMoney = (n: number, cur = 'USD') =>
  `${cur === 'USD' ? '$' : cur + ' '}${n.toLocaleString()}`;

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  advance: 'Advance', milestone: 'Milestone', final: 'Final', installment: 'Installment',
};

interface AddPaymentForm {
  contract: string;
  amount: string;
  paymentType: string;
  referenceNumber: string;
  description: string;
  paymentDate: string;
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '14px', color: '#0f172a', background: '#fff', boxSizing: 'border-box', outline: 'none',
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'procurement_officer';

  const [contract, setContract] = useState<Contract | null>(null);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [payForm, setPayForm] = useState<AddPaymentForm>({
    contract: id ?? '', amount: '', paymentType: 'milestone',
    referenceNumber: '', description: '', paymentDate: '',
  });

  const [publishing, setPublishing] = useState(false);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    status: string;
    procurementMethod: string;
    startDate: string;
    endDate: string;
    contractValue: string;
  }>({ title: '', description: '', status: '', procurementMethod: '', startDate: '', endDate: '', contractValue: '' });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [contractRes, itemsRes, paymentsRes] = await Promise.all([
          contractService.get(id),
          contractService.getItems(id),
          paymentService.list({ contract: id, limit: 100 }),
        ]);
        setContract(contractRes.data);
        setItems(itemsRes.data);
        setPayments(paymentsRes.data);
      } catch {
        setError('Failed to load contract details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePublish = async () => {
    if (!id) return;
    setPublishing(true);
    setActionErr('');
    try {
      await contractService.update(id, { isPublic: true });
      setContract(c => c ? { ...c, isPublic: true } : c);
      setActionMsg('Contract published to public portal.');
    } catch {
      setActionErr('Failed to publish contract.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this contract? This cannot be undone.')) return;
    try {
      await contractService.delete(id);
      navigate('/contracts');
    } catch {
      setActionErr('Failed to delete contract.');
    }
  };

  const handleAddPayment = async () => {
    if (!payForm.amount || !payForm.paymentDate) {
      setPaymentError('Amount and Payment Date are required.');
      return;
    }
    setAddingPayment(true);
    setPaymentError('');
    try {
      await paymentService.create({
        contract: id,
        amount: parseFloat(payForm.amount),
        paymentType: payForm.paymentType as Payment['paymentType'],
        referenceNumber: payForm.referenceNumber || undefined,
        description: payForm.description || undefined,
        paymentDate: payForm.paymentDate,
      });
      const res = await paymentService.list({ contract: id!, limit: 100 });
      setPayments(res.data);
      setPaymentDrawerOpen(false);
      setPayForm({ contract: id ?? '', amount: '', paymentType: 'milestone', referenceNumber: '', description: '', paymentDate: '' });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPaymentError(msg ?? 'Failed to record payment.');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleEditOpen = () => {
    if (!contract) return;
    setEditForm({
      title: contract.title,
      description: contract.description ?? '',
      status: contract.status,
      procurementMethod: contract.procurementMethod,
      startDate: contract.startDate?.slice(0, 10) ?? '',
      endDate: contract.endDate?.slice(0, 10) ?? '',
      contractValue: String(contract.contractValue),
    });
    setEditError('');
    setEditDrawerOpen(true);
  };

  const handleEditSave = async () => {
    if (!id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await contractService.update(id, {
        title: editForm.title,
        description: editForm.description || undefined,
        status: editForm.status as Contract['status'],
        procurementMethod: editForm.procurementMethod as Contract['procurementMethod'],
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        contractValue: parseFloat(editForm.contractValue),
      });
      if (res.success && res.data) {
        setContract(res.data);
        setEditDrawerOpen(false);
        setActionMsg('Contract updated successfully.');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg ?? 'Failed to update contract.');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: '16px' }}>Loading...</span>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '32px 24px' }}>
        <Alert type="error" message={error || 'Contract not found.'} />
      </div>
    );
  }

  const vendor = typeof contract.vendor === 'object' ? contract.vendor as Vendor : null;
  const dept = typeof contract.department === 'object' ? contract.department as Department : null;
  const createdBy = typeof contract.createdBy === 'object' ? contract.createdBy as User : null;
  const isDirectAward = contract.procurementMethod === 'direct_award';

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
  const paymentPct = contract.contractValue > 0 ? Math.min(100, (totalPaid / contract.contractValue) * 100) : 0;
  const remaining = Math.max(0, contract.contractValue - totalPaid);

  const tdStyle: React.CSSProperties = {
    padding: '14px 16px', fontSize: '14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0',
  };
  const thStyle: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700,
    color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em',
    background: '#f1f5f9', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/contracts')}>Contracts</span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: '#1e3a8a', fontWeight: 600 }}>{contract.contractNumber}</span>
      </div>

      {/* Action alerts */}
      {actionMsg && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="success" message={actionMsg} onClose={() => setActionMsg('')} />
        </div>
      )}
      {actionErr && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={actionErr} onClose={() => setActionErr('')} />
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{contract.title}</h1>
            <StatusBadge status={contract.status} />
            {isDirectAward && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>
                <AlertTriangle size={12} /> Direct Award
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
            ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e3a8a' }}>{contract.contractNumber}</span>
            {' • '}Created {fmtDate(contract.createdAt)}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '24px', marginTop: '24px' }}>
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Contract Overview */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 20px 0' }}>Contract Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow label="Contract No." value={<span style={{ fontFamily: 'monospace', color: '#1e3a8a', fontWeight: 600 }}>{contract.contractNumber}</span>} />
              <InfoRow
                label="Vendor"
                value={
                  vendor ? (
                    <span
                      style={{ color: '#1e3a8a', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => navigate(`/vendors/${vendor._id}`)}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {vendor.name}
                    </span>
                  ) : '—'
                }
              />
              <InfoRow
                label="Department"
                value={
                  dept ? (
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{dept.name}</span>
                  ) : '—'
                }
              />
              <InfoRow label="Created By" value={createdBy?.name ?? '—'} />
              <InfoRow
                label="Contract Value"
                value={
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a8a' }}>
                    {fmtMoney(contract.contractValue, contract.currency)}
                  </span>
                }
              />
              <InfoRow
                label="Total Paid"
                value={
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                    {fmtMoney(totalPaid, contract.currency)}
                  </span>
                }
              />
              <InfoRow
                label="Period"
                value={`${fmtDate(contract.startDate)} — ${fmtDate(contract.endDate)}`}
              />
              <InfoRow
                label="Procurement Method"
                value={
                  isDirectAward ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 600 }}>
                      <AlertTriangle size={13} /> Direct Award
                    </span>
                  ) : (
                    contract.procurementMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  )
                }
              />
              {contract.description && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoRow label="Description" value={contract.description} />
                </div>
              )}
            </div>
          </div>

          {/* Contract Line Items */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Contract Line Items</h2>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{items.length} items</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Unit</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Price</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Overpriced?</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '32px', border: 'none' }}>
                      No line items found.
                    </td>
                  </tr>
                ) : items.map((item, i) => {
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  const isOverpriced = false; // no market price field in model; placeholder
                  return (
                    <tr key={item._id} style={{ background: rowBg }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{item.description}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#475569' }}>{item.unit ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(item.unitPrice, contract.currency)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(item.totalPrice, contract.currency)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {isOverpriced ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 700 }}>
                            <AlertTriangle size={11} /> Yes
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Payment History */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Payment History</h2>
              {canWrite && (
                <Button variant="primary" size="sm" onClick={() => setPaymentDrawerOpen(true)}>
                  <Plus size={13} /> Add Payment
                </Button>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Transaction ID</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={thStyle}>Payment Date</th>
                  <th style={thStyle}>Method</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '32px', border: 'none' }}>
                      No payments recorded.
                    </td>
                  </tr>
                ) : payments.map((p, i) => {
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  return (
                    <tr key={p._id} style={{ background: rowBg }}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px', color: '#475569' }}>
                        {p.referenceNumber ?? p._id.slice(-8).toUpperCase()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#1e3a8a', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(p.amount, p.currency)}
                      </td>
                      <td style={{ ...tdStyle, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDate(p.paymentDate)}</td>
                      <td style={{ ...tdStyle, color: '#475569' }}>{PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}</td>
                      <td style={tdStyle}><StatusBadge status={p.status} /></td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Risk Card */}
          <div style={{ background: '#fff', border: '2px solid #f97316', borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 8px 0' }}>Risk Rating</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#ea580c' }}>High</span>
            </div>
            <button
              style={{ fontSize: '13px', color: '#1e3a8a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              onClick={() => navigate('/audits')}
            >
              View Audit
            </button>
          </div>

          {/* Payment Disbursement */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>Payment Disbursement</h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>Progress</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#d97706' }}>{paymentPct.toFixed(1)}%</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${paymentPct}%`, background: '#d97706', height: '100%', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px 0' }}>Paid</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{fmtMoney(totalPaid, contract.currency)}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px 0' }}>Remaining</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{fmtMoney(remaining, contract.currency)}</p>
              </div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px 0' }}>Contract Total</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a8a', margin: 0 }}>{fmtMoney(contract.contractValue, contract.currency)}</p>
            </div>
          </div>

          {/* Audit Compliance */}
          <div style={{ background: '#1e3a8a', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Audit Compliance</h3>
            <p style={{ fontSize: '13px', color: '#93c5fd', margin: '0 0 16px 0' }}>Last reviewed: {fmtDate(contract.updatedAt)}</p>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '8px 14px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <Download size={14} /> Download Report
            </button>
          </div>

          {/* Contract status meta */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>Published</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: contract.isPublic ? '#16a34a' : '#94a3b8' }}>
                  {contract.isPublic ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>Currency</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{contract.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>Payments</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{payments.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>Line Items</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{items.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      {canWrite && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <Button
            variant="ghost"
            style={{ borderColor: '#dc2626', color: '#dc2626' }}
            onClick={handleDelete}
          >
            Delete Contract
          </Button>
          <Button variant="ghost" onClick={handleEditOpen}>
            Edit Contract
          </Button>
          {!contract.isPublic && (
            <Button
              variant="primary"
              style={{ background: '#0d9488', marginLeft: 'auto' }}
              loading={publishing}
              onClick={handlePublish}
            >
              Publish to Portal
            </Button>
          )}
          {contract.isPublic && (
            <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              ✓ Published to Portal
            </span>
          )}
        </div>
      )}

      {/* Add Payment Drawer */}
      <Drawer
        open={paymentDrawerOpen}
        onClose={() => { setPaymentDrawerOpen(false); setPaymentError(''); }}
        title="Add Payment"
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaymentDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={addingPayment} onClick={handleAddPayment}>Record Payment</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {paymentError && <Alert type="error" message={paymentError} onClose={() => setPaymentError('')} />}
          <div>
            <label style={labelStyle}>Amount *</label>
            <input
              style={inputStyle} type="number" min="0"
              value={payForm.amount}
              onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Type</label>
            <select style={inputStyle} value={payForm.paymentType} onChange={e => setPayForm(f => ({ ...f, paymentType: e.target.value }))}>
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
              value={payForm.referenceNumber}
              onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))}
              placeholder="REF-XXXX"
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Date *</label>
            <input
              style={inputStyle} type="date"
              value={payForm.paymentDate}
              onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
              value={payForm.description}
              onChange={e => setPayForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Payment notes..."
            />
          </div>
        </div>
      </Drawer>

      {/* Edit Contract Drawer */}
      <Drawer
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); setEditError(''); }}
        title="Edit Contract"
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={editSaving} onClick={handleEditSave}>Save Changes</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editError && <Alert type="error" message={editError} onClose={() => setEditError('')} />}
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="under_review">Under Review</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Procurement Method</label>
            <select style={inputStyle} value={editForm.procurementMethod}
              onChange={e => setEditForm(f => ({ ...f, procurementMethod: e.target.value }))}>
              <option value="open_tender">Open Tender</option>
              <option value="restricted_tender">Restricted Tender</option>
              <option value="direct_award">Direct Award</option>
              <option value="framework_agreement">Framework Agreement</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input style={inputStyle} type="date" value={editForm.startDate}
                onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input style={inputStyle} type="date" value={editForm.endDate}
                onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Contract Value (USD)</label>
            <input style={inputStyle} type="number" min="0" value={editForm.contractValue}
              onChange={e => setEditForm(f => ({ ...f, contractValue: e.target.value }))} />
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px 0' }}>
        {label}
      </p>
      <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 400 }}>
        {value}
      </div>
    </div>
  );
}
