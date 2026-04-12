import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Eye, AlertTriangle, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { auditService } from '../../services/auditService';
import { contractService } from '../../services/contractService';
import { vendorService } from '../../services/vendorService';
import { useAuth } from '../../context/AuthContext';
import type { Audit, AuditFinding, Contract, Vendor, AuditType, AuditStatus, RiskRating, FindingType, FindingSeverity, FindingStatus } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import RiskBadge from '../../components/ui/RiskBadge';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Alert from '../../components/ui/Alert';

const riskCardStyles: Record<string, { bg: string; border: string; text: string; barColors: string[] }> = {
  critical: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', barColors: ['#dc2626', '#dc2626', '#dc2626', '#dc2626'] },
  high:     { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', barColors: ['#ea580c', '#ea580c', '#ea580c', '#e2e8f0'] },
  medium:   { bg: '#fefce8', border: '#fde68a', text: '#ca8a04', barColors: ['#ca8a04', '#ca8a04', '#e2e8f0', '#e2e8f0'] },
  low:      { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', barColors: ['#16a34a', '#e2e8f0', '#e2e8f0', '#e2e8f0'] },
};

const AUDIT_TYPES: AuditType[] = ['routine', 'forensic', 'compliance', 'performance'];
const AUDIT_STATUSES: AuditStatus[] = ['planned', 'in_progress', 'completed', 'cancelled'];
const RISK_RATINGS: RiskRating[] = ['low', 'medium', 'high', 'critical'];
const FINDING_TYPES: FindingType[] = ['fraud', 'overpricing', 'delay', 'non_compliance', 'documentation', 'other'];
const FINDING_SEVERITIES: FindingSeverity[] = ['low', 'medium', 'high', 'critical'];
const FINDING_STATUSES: FindingStatus[] = ['open', 'in_progress', 'resolved', 'dismissed'];

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

const severityCount = (findings: AuditFinding[], level: string) =>
  findings.filter(f => f.severity === level).length;

const severityDot: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
};

const findingTypeLabel = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const auditPhases = [
  { label: 'Planning', icon: Clock },
  { label: 'Fieldwork', icon: TrendingUp },
  { label: 'Analysis', icon: AlertTriangle },
  { label: 'Reporting', icon: FileText },
  { label: 'Follow-up', icon: CheckCircle2 },
];

const phaseForStatus = (status: string): number => {
  if (status === 'planned') return 0;
  if (status === 'in_progress') return 2;
  if (status === 'completed') return 4;
  return 0;
};

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [editForm, setEditForm] = useState({
    title: '',
    auditType: 'routine' as AuditType,
    status: 'planned' as AuditStatus,
    contract: '',
    vendor: '',
    startDate: '',
    endDate: '',
    summary: '',
    riskRating: 'low' as RiskRating,
  });

  // Finding management state
  const [findingDrawerOpen, setFindingDrawerOpen] = useState(false);
  const [findingForm, setFindingForm] = useState({
    title: '',
    findingType: 'non_compliance' as FindingType,
    severity: 'medium' as FindingSeverity,
    description: '',
    recommendation: '',
  });
  const [findingSubmitting, setFindingSubmitting] = useState(false);
  const [findingError, setFindingError] = useState('');

  // View/edit finding state
  const [viewFindingOpen, setViewFindingOpen] = useState(false);
  const [activeFinding, setActiveFinding] = useState<AuditFinding | null>(null);
  const [editFindingForm, setEditFindingForm] = useState({ status: 'open' as FindingStatus, recommendation: '' });
  const [editFindingSubmitting, setEditFindingSubmitting] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [auditRes, findingsRes] = await Promise.all([
        auditService.get(id),
        auditService.getFindings(id),
      ]);
      setAudit(auditRes.data);
      setFindings(findingsRes.data);
    } catch {
      setError('Failed to load audit details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    contractService.list({ limit: 100 }).then(r => setContracts(r.data)).catch(() => {});
    vendorService.list({ limit: 100 }).then(r => setVendors(r.data)).catch(() => {});
  }, []);

  const openEdit = () => {
    if (!audit) return;
    setEditForm({
      title: audit.title,
      auditType: audit.auditType,
      status: audit.status,
      contract: typeof audit.contract === 'object' ? (audit.contract as Contract)._id : (audit.contract ?? ''),
      vendor: typeof audit.vendor === 'object' ? (audit.vendor as Vendor)._id : (audit.vendor ?? ''),
      startDate: audit.startDate ? audit.startDate.slice(0, 10) : '',
      endDate: audit.endDate ? audit.endDate.slice(0, 10) : '',
      summary: audit.summary ?? '',
      riskRating: audit.riskRating,
    });
    setEditOpen(true);
  };

  const handleAddFinding = async () => {
    if (!id) return;
    if (!findingForm.title.trim() || !findingForm.description.trim()) {
      setFindingError('Title and description are required.');
      return;
    }
    setFindingSubmitting(true);
    setFindingError('');
    try {
      await auditService.addFinding(id, {
        title: findingForm.title,
        findingType: findingForm.findingType,
        severity: findingForm.severity,
        description: findingForm.description,
        recommendation: findingForm.recommendation || undefined,
      } as Partial<AuditFinding>);
      setFindingDrawerOpen(false);
      setFindingForm({ title: '', findingType: 'non_compliance', severity: 'medium', description: '', recommendation: '' });
      setSuccessMsg('Finding added successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch {
      setFindingError('Failed to add finding.');
    } finally {
      setFindingSubmitting(false);
    }
  };

  const openViewFinding = (finding: AuditFinding) => {
    setActiveFinding(finding);
    setEditFindingForm({ status: finding.status, recommendation: finding.recommendation ?? '' });
    setViewFindingOpen(true);
  };

  const handleUpdateFinding = async () => {
    if (!id || !activeFinding) return;
    setEditFindingSubmitting(true);
    try {
      await auditService.updateFinding(id, activeFinding._id, {
        status: editFindingForm.status,
        recommendation: editFindingForm.recommendation || undefined,
      } as Partial<AuditFinding>);
      setViewFindingOpen(false);
      setSuccessMsg('Finding updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch {
      setError('Failed to update finding.');
    } finally {
      setEditFindingSubmitting(false);
    }
  };

  const handleDeleteFinding = async () => {
    if (!id || !activeFinding) return;
    if (!window.confirm(`Delete finding "${activeFinding.title}"? This cannot be undone.`)) return;
    setEditFindingSubmitting(true);
    try {
      await auditService.deleteFinding(id, activeFinding._id);
      setViewFindingOpen(false);
      setSuccessMsg('Finding deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch {
      setError('Failed to delete finding.');
    } finally {
      setEditFindingSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!id || !audit) return;
    setSubmitting(true);
    try {
      await auditService.update(id, {
        title: editForm.title,
        auditType: editForm.auditType,
        status: editForm.status,
        contract: editForm.contract || undefined,
        vendor: editForm.vendor || undefined,
        startDate: editForm.startDate,
        endDate: editForm.endDate || undefined,
        summary: editForm.summary || undefined,
        riskRating: editForm.riskRating,
      });
      setEditOpen(false);
      setSuccessMsg('Audit updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch {
      setError('Failed to update audit.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getContractRef = () => {
    if (!audit?.contract) return null;
    if (typeof audit.contract === 'object') return { number: audit.contract.contractNumber, id: audit.contract._id };
    return { number: String(audit.contract), id: String(audit.contract) };
  };

  const getAuditorName = () => {
    if (!audit?.auditor) return '—';
    if (typeof audit.auditor === 'object') return audit.auditor.name;
    return '—';
  };

  const estimatedImpact = findings.reduce((sum, f) => {
    const add = f.severity === 'critical' ? 500000 : f.severity === 'high' ? 100000 : f.severity === 'medium' ? 25000 : 5000;
    return sum + add;
  }, 0);

  const canEdit = user?.role === 'admin' || user?.role === 'auditor';
  const canManageFindings = user?.role === 'auditor';

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>Loading audit details...</p>
      </div>
    );
  }

  if (!audit) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
        <Alert type="error" message={error || 'Audit not found.'} />
      </div>
    );
  }

  const contractRef = getContractRef();
  const auditorName = getAuditorName();
  const riskStyle = riskCardStyles[audit.riskRating] ?? riskCardStyles.low;
  const activePhase = phaseForStatus(audit.status);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
        <span style={{ cursor: 'pointer', color: '#1e3a8a' }} onClick={() => navigate('/audits')}>
          Audits
        </span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>{audit.auditNumber}</span>
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

      {/* Top actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
        <Button variant="secondary" size="md" onClick={() => window.print()}>Export PDF</Button>
        {canEdit && (
          <Button variant="primary" size="md" onClick={openEdit}>Edit Audit</Button>
        )}
      </div>

      {/* Header card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{audit.title}</h1>
              <StatusBadge status={audit.status} />
            </div>
            {contractRef && (
              <div style={{ marginBottom: '20px' }}>
                <span
                  style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate(`/contracts/${contractRef.id}`)}
                >
                  Contract: {contractRef.number}
                </span>
              </div>
            )}

            {/* 4-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { label: 'Lead Auditor', value: auditorName },
                { label: 'Audit Type', value: audit.auditType.charAt(0).toUpperCase() + audit.auditType.slice(1) },
                { label: 'Initiated', value: formatDate(audit.startDate) },
                { label: 'Compliance Status', value: <StatusBadge status={audit.complianceOutcome} /> },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 4px' }}>
                    {item.label}
                  </p>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk card */}
          <div style={{
            width: '200px',
            flexShrink: 0,
            backgroundColor: riskStyle.bg,
            border: `1px solid ${riskStyle.border}`,
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: riskStyle.text, margin: 0 }}>
              Risk Level
            </p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: riskStyle.text, margin: 0, textTransform: 'uppercase' }}>
              {audit.riskRating}
            </p>
            <div style={{ display: 'flex', gap: '4px' }}>
              {riskStyle.barColors.map((c, i) => (
                <div key={i} style={{ width: '28px', height: '6px', borderRadius: '3px', backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>

        {/* Executive Summary (8/12) */}
        <div style={{ gridColumn: 'span 8', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} style={{ color: '#1e3a8a' }} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Executive Summary</h2>
          </div>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 20px' }}>
            {audit.summary || 'No summary provided for this audit.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 6px' }}>
                Scope of Work
              </p>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                {audit.auditType.charAt(0).toUpperCase() + audit.auditType.slice(1)} audit covering all transactions and processes related to the assigned contract.
              </p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 6px' }}>
                Period Covered
              </p>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                {formatDate(audit.startDate)} {audit.endDate ? `— ${formatDate(audit.endDate)}` : '(ongoing)'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats side (4/12) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Finding Overview */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', flex: 1 }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Finding Overview</h3>
            {(['critical', 'high', 'medium', 'low'] as const).map(s => {
              const count = severityCount(findings, s);
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: severityDot[s], flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#475569', textTransform: 'capitalize' }}>{s}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Estimated Impact */}
          <div style={{ backgroundColor: '#1e3a8a', borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', margin: '0 0 8px' }}>
              Estimated Impact
            </p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              ${estimatedImpact.toLocaleString()}
            </p>
            <p style={{ fontSize: '12px', color: '#93c5fd', margin: '6px 0 0' }}>
              Based on {findings.length} finding{findings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Detailed Findings table (12/12) */}
        <div style={{ gridColumn: 'span 12', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Detailed Findings</h2>
            {canManageFindings && audit.status !== 'cancelled' && (
              <Button variant="primary" size="sm" onClick={() => setFindingDrawerOpen(true)}>
                + Add Finding
              </Button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  {['ID', 'Finding Description', 'Severity', 'Category', 'Action'].map(col => (
                    <th key={col} style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#475569',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                      No findings recorded for this audit.
                    </td>
                  </tr>
                ) : (
                  findings.map((finding, idx) => (
                    <tr
                      key={finding._id}
                      style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        F-{String(idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '360px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{finding.title}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {finding.description}
                        </p>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <RiskBadge level={finding.severity} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {findingTypeLabel(finding.findingType)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          title="View / update finding"
                          onClick={() => openViewFinding(finding)}
                          style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', color: '#475569' }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations & Audit Progress (12/12 as 2 cols) */}
        <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Immediate Recommendations */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Immediate Recommendations</h3>
            {findings.filter(f => f.recommendation).length === 0 ? (
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>No recommendations yet.</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {findings.filter(f => f.recommendation).map((f, idx) => (
                  <li key={f._id} style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{idx + 1}. </span>
                    {f.recommendation}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Audit Progress */}
          <div style={{ backgroundColor: '#1e3a8a', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: '0 0 24px' }}>Audit Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {auditPhases.map((phase, idx) => {
                const isDone = idx <= activePhase;
                const isActive = idx === activePhase;
                const Icon = phase.icon;
                return (
                  <div key={phase.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: idx < auditPhases.length - 1 ? '16px' : 0 }}>
                    {/* Timeline line + dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isDone ? '#0d9488' : 'rgba(255,255,255,0.1)',
                        border: isActive ? '2px solid #0d9488' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={12} style={{ color: isDone ? '#ffffff' : 'rgba(255,255,255,0.3)' }} />
                      </div>
                      {idx < auditPhases.length - 1 && (
                        <div style={{ width: '2px', flex: 1, minHeight: '16px', backgroundColor: isDone ? '#0d9488' : 'rgba(255,255,255,0.1)', marginTop: '4px' }} />
                      )}
                    </div>
                    <div style={{ paddingTop: '4px' }}>
                      <p style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isDone ? '#ffffff' : 'rgba(255,255,255,0.4)', margin: 0 }}>
                        {phase.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Audit Drawer */}
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Audit"
        width={480}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleSave} loading={submitting}>Save Changes</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Title <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Audit Type</label>
            <select
              value={editForm.auditType}
              onChange={e => setEditForm(f => ({ ...f, auditType: e.target.value as AuditType }))}
              style={inputStyle}
            >
              {AUDIT_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value as AuditStatus }))}
              style={inputStyle}
            >
              {AUDIT_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Contract</label>
            <select
              value={editForm.contract}
              onChange={e => setEditForm(f => ({ ...f, contract: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— Select contract —</option>
              {contracts.map(c => (
                <option key={c._id} value={c._id}>{c.contractNumber} — {c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Vendor</label>
            <select
              value={editForm.vendor}
              onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— Select vendor —</option>
              {vendors.map(v => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Start Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                value={editForm.startDate}
                onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input
                type="date"
                value={editForm.endDate}
                onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Risk Rating</label>
            <select
              value={editForm.riskRating}
              onChange={e => setEditForm(f => ({ ...f, riskRating: e.target.value as RiskRating }))}
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
              value={editForm.summary}
              onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
            />
          </div>
        </div>
      </Drawer>

      {/* Add Finding Drawer */}
      <Drawer
        open={findingDrawerOpen}
        onClose={() => { setFindingDrawerOpen(false); setFindingError(''); }}
        title="Add Finding"
        width={480}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setFindingDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleAddFinding} loading={findingSubmitting}>Add Finding</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {findingError && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626' }}>
              {findingError}
            </div>
          )}
          <div>
            <label style={labelStyle}>Title <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              value={findingForm.title}
              onChange={e => setFindingForm(f => ({ ...f, title: e.target.value }))}
              style={inputStyle}
              placeholder="Brief title for the finding"
            />
          </div>
          <div>
            <label style={labelStyle}>Finding Type</label>
            <select
              value={findingForm.findingType}
              onChange={e => setFindingForm(f => ({ ...f, findingType: e.target.value as FindingType }))}
              style={inputStyle}
            >
              {FINDING_TYPES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Severity</label>
            <select
              value={findingForm.severity}
              onChange={e => setFindingForm(f => ({ ...f, severity: e.target.value as FindingSeverity }))}
              style={inputStyle}
            >
              {FINDING_SEVERITIES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              value={findingForm.description}
              onChange={e => setFindingForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
              placeholder="Detailed description of the finding..."
            />
          </div>
          <div>
            <label style={labelStyle}>Recommendation</label>
            <textarea
              value={findingForm.recommendation}
              onChange={e => setFindingForm(f => ({ ...f, recommendation: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
              placeholder="Recommended corrective action..."
            />
          </div>
        </div>
      </Drawer>

      {/* View / Update Finding Drawer */}
      <Drawer
        open={viewFindingOpen}
        onClose={() => setViewFindingOpen(false)}
        title="Finding Details"
        width={480}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setViewFindingOpen(false)}>Close</Button>
            {canManageFindings && (
              <>
                <Button variant="destructive" size="md" onClick={handleDeleteFinding} loading={editFindingSubmitting}>Delete</Button>
                <Button variant="primary" size="md" onClick={handleUpdateFinding} loading={editFindingSubmitting}>Update Finding</Button>
              </>
            )}
          </>
        }
      >
        {activeFinding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Read-only details */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{activeFinding.title}</p>
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 8px', lineHeight: '1.5' }}>{activeFinding.description}</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <RiskBadge level={activeFinding.severity} />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {activeFinding.findingType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>
            </div>

            {canManageFindings ? (
              <>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={editFindingForm.status}
                    onChange={e => setEditFindingForm(f => ({ ...f, status: e.target.value as FindingStatus }))}
                    style={inputStyle}
                  >
                    {FINDING_STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Recommendation</label>
                  <textarea
                    value={editFindingForm.recommendation}
                    onChange={e => setEditFindingForm(f => ({ ...f, recommendation: e.target.value }))}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
                    placeholder="Recommended corrective action..."
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>Status</label>
                  <p style={{ fontSize: '14px', color: '#0f172a', margin: 0 }}>
                    {activeFinding.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                </div>
                {activeFinding.recommendation && (
                  <div>
                    <label style={labelStyle}>Recommendation</label>
                    <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.5' }}>{activeFinding.recommendation}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
