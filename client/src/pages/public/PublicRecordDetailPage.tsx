import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import type { PublicRecord, PublicComment, Contract, Vendor, Department } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

function getContract(record: PublicRecord): Contract | null {
  if (!record.contract) return null;
  if (typeof record.contract === 'string') return null;
  return record.contract as Contract;
}

function getVendorName(contract: Contract | null): string {
  if (!contract) return '—';
  if (typeof contract.vendor === 'string') return contract.vendor;
  return (contract.vendor as Vendor).name ?? '—';
}

function getDeptName(contract: Contract | null): string {
  if (!contract) return '—';
  if (typeof contract.department === 'string') return contract.department;
  return (contract.department as Department).name ?? '—';
}

function getStatusBadge(status: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
    completed: { bg: '#eff6ff', color: '#1d4ed8', label: 'Completed' },
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    terminated: { bg: '#fee2e2', color: '#b91c1c', label: 'Terminated' },
    under_review: { bg: '#fff7ed', color: '#ea580c', label: 'Under Review' },
  };
  return map[status] ?? { bg: '#f1f5f9', color: '#64748b', label: status };
}

function formatProcurement(method: string): string {
  const map: Record<string, string> = {
    open_tender: 'Open Tender',
    restricted_tender: 'Restricted Tender',
    direct_award: 'Direct Award',
    framework_agreement: 'Framework Agreement',
    emergency: 'Emergency',
  };
  return map[method] ?? method;
}

// ─── Currency Converter ───────────────────────────────────────────────────────

interface CurrencyConverterProps {
  recordId: string;
  contractCurrency: string;
}

const QUICK_CURRENCIES = ['USD', 'LKR', 'EUR', 'GBP'];

function CurrencyConverter({ recordId, contractCurrency }: CurrencyConverterProps) {
  const [currencies, setCurrencies] = useState<Record<string, string>>({});
  const [selectedTo, setSelectedTo] = useState('EUR');
  const [selectedFrom] = useState(contractCurrency || 'USD');
  const [result, setResult] = useState<{ amount: number; rate: number; from: string; to: string } | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    publicService.getCurrencies()
      .then(res => { if (res.success) setCurrencies(res.data); })
      .catch(() => {});
  }, []);

  async function handleConvert(to: string) {
    setSelectedTo(to);
    setConverting(true);
    setError('');
    try {
      const res = await publicService.convertCurrency(recordId, to, selectedFrom);
      if (res.success) setResult(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  }

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  };

  // currencies not in quick list
  const otherCurrencies = Object.keys(currencies).filter(k => !QUICK_CURRENCIES.includes(k));

  return (
    <div style={sectionStyle}>
      <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
        Currency Converter
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8' }}>
        Convert contract value from {selectedFrom} to another currency.
      </p>

      {/* Quick currency buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {QUICK_CURRENCIES.filter(c => c !== selectedFrom).map(c => (
          <button
            key={c}
            onClick={() => handleConvert(c)}
            disabled={converting}
            style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
              border: selectedTo === c && result ? '2px solid #1e3a8a' : '1.5px solid #e2e8f0',
              backgroundColor: selectedTo === c && result ? '#eff3ff' : '#f8fafc',
              color: selectedTo === c && result ? '#1e3a8a' : '#475569',
              cursor: converting ? 'not-allowed' : 'pointer',
              opacity: converting ? 0.7 : 1,
            }}
          >
            {c}
          </button>
        ))}
        {otherCurrencies.length > 0 && (
          <select
            onChange={e => { if (e.target.value) handleConvert(e.target.value); }}
            disabled={converting}
            defaultValue=""
            style={{
              padding: '8px 12px', borderRadius: '8px', fontSize: '14px',
              border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="" disabled>Other…</option>
            {otherCurrencies.map(c => (
              <option key={c} value={c}>{c} — {currencies[c]}</option>
            ))}
          </select>
        )}
      </div>

      {/* Result display */}
      {converting && (
        <div style={{ fontSize: '14px', color: '#94a3b8', padding: '12px 0' }}>Converting…</div>
      )}
      {!converting && result && (
        <div style={{
          backgroundColor: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: '10px', padding: '16px 20px',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a' }}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency', currency: result.to,
              minimumFractionDigits: 0, maximumFractionDigits: 0,
            }).format(result.amount)}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
            1 {result.from} = {result.rate} {result.to} · Exchange rates via Frankfurter API
          </div>
        </div>
      )}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          borderRadius: '8px', padding: '10px 14px', fontSize: '13px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Comments Section ─────────────────────────────────────────────────────────

interface CommentsSectionProps {
  recordId: string;
}

function CommentsSection({ recordId }: CommentsSectionProps) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // Form state
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    publicService.getComments(recordId)
      .then(res => { if (res.success) setComments(res.data); })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [recordId]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { setSubmitError('Comment content is required.'); return; }
    if (content.trim().length < 10) { setSubmitError('Comment must be at least 10 characters.'); return; }
    if (!isAnonymous && !authorName.trim()) { setSubmitError('Name is required.'); return; }
    if (!isAnonymous && authorName.trim().length < 2) { setSubmitError('Name must be at least 2 characters.'); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      await publicService.addComment(recordId, {
        authorName: isAnonymous ? 'Anonymous' : authorName,
        authorEmail: authorEmail || undefined,
        content,
        isAnonymous,
      });
      setSubmitSuccess(true);
      setAuthorName('');
      setAuthorEmail('');
      setContent('');
      setIsAnonymous(false);

      // Refresh comments
      const res = await publicService.getComments(recordId);
      if (res.success) setComments(res.data);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit comment.');
    } finally {
      setSubmitting(false);
    }
  }

  const approvedComments = comments.filter(c => c.status === 'approved');

  const inputStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0', borderRadius: '8px',
    padding: '10px 14px', fontSize: '14px', color: '#0f172a',
    outline: 'none', width: '100%', boxSizing: 'border-box',
    backgroundColor: '#ffffff',
  };

  return (
    <div>
      {/* Comments list */}
      <div style={{
        backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
        borderRadius: '12px', padding: '24px', marginBottom: '24px',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
          Public Comments ({approvedComments.length})
        </h2>

        {loadingComments ? (
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading comments…</div>
        ) : approvedComments.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
            No public comments yet. Be the first to comment.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {approvedComments.map(c => (
              <div key={c._id} style={{ display: 'flex', gap: '12px' }}>
                {/* Avatar */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: c.isAnonymous ? '#94a3b8' : '#1e3a8a',
                  color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700,
                }}>
                  {c.isAnonymous ? '?' : getInitials(c.authorName)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                      {c.isAnonymous ? 'Anonymous' : c.authorName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatShortDate(c.createdAt)}</span>
                    {c.isAnonymous && (
                      <span style={{
                        backgroundColor: '#1e293b', color: '#e2e8f0',
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '9999px', textTransform: 'uppercase',
                      }}>
                        Whistleblower Report
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave a comment form */}
      <div style={{
        backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
        borderRadius: '12px', padding: '24px',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
          Leave a Comment
        </h2>

        {submitSuccess && (
          <div style={{
            backgroundColor: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: '8px', padding: '12px 16px',
            fontSize: '14px', color: '#16a34a', marginBottom: '16px',
          }}>
            Thank you! Your comment has been submitted and is pending review.
          </div>
        )}

        {submitError && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', padding: '12px 16px',
            fontSize: '14px', color: '#b91c1c', marginBottom: '16px',
          }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmitComment}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Name {!isAnonymous && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input
                style={{ ...inputStyle, opacity: isAnonymous ? 0.5 : 1 }}
                placeholder={isAnonymous ? 'Hidden (anonymous)' : 'Your name'}
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                disabled={isAnonymous}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Email <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                style={{ ...inputStyle, opacity: isAnonymous ? 0.5 : 1 }}
                type="email"
                placeholder={isAnonymous ? 'Hidden (anonymous)' : 'your@email.com'}
                value={authorEmail}
                onChange={e => setAuthorEmail(e.target.value)}
                disabled={isAnonymous}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
              Comment <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' }}
              placeholder="Share your thoughts, concerns, or information about this contract…"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1e3a8a' }}
              />
              Submit anonymously
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', marginTop: '2px' }}
              />
              <span>
                This is a whistleblower report
                <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8' }}>
                  Whistleblower reports are submitted anonymously and handled with confidentiality.
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: '#1e3a8a', color: '#ffffff',
              border: 'none', borderRadius: '8px',
              padding: '11px 24px', fontSize: '14px', fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<PublicRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    publicService.getRecord(id)
      .then(res => {
        if (res.success) setRecord(res.data);
        else setError('Record not found.');
      })
      .catch(() => setError('Failed to load record.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
        Loading contract details…
      </div>
    );
  }

  if (error || !record) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          borderRadius: '12px', padding: '24px', fontSize: '14px', display: 'inline-block',
        }}>
          {error || 'Record not found.'}
        </div>
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => navigate('/portal')}
            style={{
              border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
              borderRadius: '8px', padding: '9px 20px', fontSize: '14px', cursor: 'pointer',
            }}
          >
            ← Back to Portal
          </button>
        </div>
      </div>
    );
  }

  const contract = getContract(record);
  const status = contract?.status ?? '';
  const statusBadge = getStatusBadge(status);
  const contractValue = contract?.contractValue ?? 0;
  const currency = contract?.currency ?? 'USD';
  const vendorName = getVendorName(contract);
  const deptName = getDeptName(contract);
  const procurementMethod = formatProcurement(contract?.procurementMethod ?? '');

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 600, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '15px', color: '#0f172a', fontWeight: 500,
  };

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '48px' }}>
      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: '#94a3b8', marginBottom: '20px',
      }}>
        <span
          style={{ color: '#0d9488', cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => navigate('/portal')}
        >
          Public Portal
        </span>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.title}
        </span>
      </div>

      {/* Page title */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
            {record.title}
          </h1>
          <span style={{
            backgroundColor: statusBadge.bg, color: statusBadge.color,
            fontSize: '12px', fontWeight: 700, padding: '4px 12px',
            borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
          }}>
            {statusBadge.label}
          </span>
        </div>
        {/* Published info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
          {/* calendar icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Published {formatDate(record.publishedAt)}
          <span style={{ marginLeft: '12px' }}>{record.viewCount} views</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Contract Summary */}
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Contract Summary
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Contract Value */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={labelStyle}>Contract Value</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#1e3a8a' }}>
                  {formatCurrency(contractValue, currency)}
                </div>
              </div>

              <div>
                <div style={labelStyle}>Vendor</div>
                <div style={valueStyle}>{vendorName}</div>
              </div>
              <div>
                <div style={labelStyle}>Department</div>
                <div style={valueStyle}>{deptName}</div>
              </div>
              <div>
                <div style={labelStyle}>Procurement Method</div>
                <div style={valueStyle}>{procurementMethod}</div>
              </div>
              <div>
                <div style={labelStyle}>Contract Number</div>
                <div style={valueStyle}>{contract?.contractNumber ?? '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>Start Date</div>
                <div style={valueStyle}>{contract?.startDate ? formatDate(contract.startDate) : '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>End Date</div>
                <div style={valueStyle}>{contract?.endDate ? formatDate(contract.endDate) : '—'}</div>
              </div>
            </div>
          </div>

          {/* About This Contract */}
          {(record.description || contract?.description) && (
            <div style={sectionStyle}>
              <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                About This Contract
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {record.description ?? contract?.description}
              </p>
            </div>
          )}

          {/* Comments section */}
          {id && <CommentsSection recordId={id} />}
        </div>

        {/* Right column */}
        <div>
          {/* Currency Converter */}
          {id && (
            <CurrencyConverter
              recordId={id}
              contractCurrency={currency}
            />
          )}

          {/* Quick info card */}
          <div style={sectionStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Quick Info
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {contract?.contractNumber && (
                <div>
                  <div style={labelStyle}>Reference</div>
                  <div style={{ fontSize: '14px', color: '#0f172a', fontFamily: 'monospace', fontWeight: 600 }}>
                    {contract.contractNumber}
                  </div>
                </div>
              )}
              <div>
                <div style={labelStyle}>Status</div>
                <span style={{
                  backgroundColor: statusBadge.bg, color: statusBadge.color,
                  fontSize: '12px', fontWeight: 700, padding: '3px 10px',
                  borderRadius: '9999px',
                }}>
                  {statusBadge.label}
                </span>
              </div>
              <div>
                <div style={labelStyle}>Currency</div>
                <div style={valueStyle}>{currency}</div>
              </div>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate('/portal')}
            style={{
              width: '100%', border: '1.5px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
              borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ← Back to Portal
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '48px', marginLeft: '-24px', marginRight: '-24px',
        backgroundColor: '#0f172a', color: '#94a3b8',
        padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {['Privacy Policy', 'Terms of Service', 'Accessibility', 'Contact Us', 'Open Data API'].map(link => (
            <a
              key={link}
              href="#"
              style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '13px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8'; }}
            >
              {link}
            </a>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: '13px' }}>
          © {new Date().getFullYear()} Civic Accountability Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
