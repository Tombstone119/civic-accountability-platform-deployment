import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import type { PublicComment, PublicRecord } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
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

function getRecordTitle(comment: PublicComment): string {
  if (!comment.publicRecord) return '';
  if (typeof comment.publicRecord === 'string') return comment.publicRecord;
  return (comment.publicRecord as PublicRecord).title ?? '';
}

function getRecordId(comment: PublicComment): string {
  if (!comment.publicRecord) return '';
  if (typeof comment.publicRecord === 'string') return comment.publicRecord;
  return (comment.publicRecord as PublicRecord)._id ?? '';
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = 'all' | 'pending' | 'approved' | 'rejected' | 'flagged';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'flagged', label: 'Flagged' },
];

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef9c3', color: '#a16207' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

// ─── Comment Card ─────────────────────────────────────────────────────────────

interface CommentCardProps {
  comment: PublicComment;
  onModerate: (id: string, status: 'approved' | 'rejected') => void;
  moderating: string | null;
}

function CommentCard({ comment, onModerate, moderating }: CommentCardProps) {
  const navigate = useNavigate();
  const isAnon = comment.isAnonymous;
  const displayName = isAnon ? 'Anonymous' : comment.authorName;
  const recordId = getRecordId(comment);
  const recordTitle = getRecordTitle(comment);
  const statusCfg = STATUS_BADGE[comment.status] ?? { bg: '#f1f5f9', color: '#64748b' };
  const isModerating = moderating === comment._id;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '12px',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        gap: '10px', marginBottom: '10px',
      }}>
        {/* Avatar */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          backgroundColor: isAnon ? '#94a3b8' : '#1e3a8a',
          color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, flexShrink: 0,
        }}>
          {isAnon ? '?' : getInitials(comment.authorName)}
        </div>

        {/* Name + date */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{displayName}</span>
          <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: '8px' }}>
            {formatDate(comment.createdAt)}
          </span>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {comment.isFlagged && (
            <span style={{
              backgroundColor: '#fee2e2', color: '#b91c1c',
              fontSize: '11px', fontWeight: 700, padding: '3px 8px',
              borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Flagged
            </span>
          )}
          {isAnon && (
            <span style={{
              backgroundColor: '#1e293b', color: '#e2e8f0',
              fontSize: '11px', fontWeight: 700, padding: '3px 8px',
              borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Whistleblower
            </span>
          )}
          <span style={{
            backgroundColor: statusCfg.bg, color: statusCfg.color,
            fontSize: '11px', fontWeight: 700, padding: '3px 8px',
            borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {comment.status}
          </span>
        </div>
      </div>

      {/* Record link */}
      {recordTitle && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
          On:{' '}
          <span
            style={{ color: '#0d9488', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => recordId && navigate(`/portal/records/${recordId}`)}
          >
            {recordTitle}
          </span>
        </div>
      )}

      {/* Content */}
      <p style={{
        margin: '0 0 16px', fontSize: '14px', color: '#0f172a',
        lineHeight: '1.6', whiteSpace: 'pre-wrap',
      }}>
        {comment.content}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {comment.status === 'pending' && (
          <>
            <button
              disabled={isModerating}
              onClick={() => onModerate(comment._id, 'approved')}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                border: '1.5px solid #16a34a', backgroundColor: 'transparent', color: '#16a34a',
                cursor: isModerating ? 'not-allowed' : 'pointer', opacity: isModerating ? 0.6 : 1,
              }}
            >
              Approve
            </button>
            <button
              disabled={isModerating}
              onClick={() => onModerate(comment._id, 'rejected')}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                border: '1.5px solid #dc2626', backgroundColor: 'transparent', color: '#dc2626',
                cursor: isModerating ? 'not-allowed' : 'pointer', opacity: isModerating ? 0.6 : 1,
              }}
            >
              Reject
            </button>
          </>
        )}
        {recordId && (
          <button
            onClick={() => navigate(`/portal/records/${recordId}`)}
            style={{
              padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              border: '1.5px solid #e2e8f0', backgroundColor: 'transparent', color: '#475569',
              cursor: 'pointer',
            }}
          >
            View Record
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommentModerationPage() {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [moderating, setModerating] = useState<string | null>(null);

  const LIMIT = 15;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: { page: number; limit: number; status?: string; isFlagged?: boolean } = {
        page,
        limit: LIMIT,
      };

      if (activeTab === 'flagged') {
        params.isFlagged = true;
      } else if (activeTab !== 'all') {
        params.status = activeTab;
      }

      const res = await publicService.listComments(params);
      let data = res.data;

      // client-side search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        data = data.filter(
          c =>
            c.authorName.toLowerCase().includes(q) ||
            c.content.toLowerCase().includes(q)
        );
      }

      setComments(data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load comments.');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function handleModerate(commentId: string, status: 'approved' | 'rejected') {
    setModerating(commentId);
    try {
      await publicService.moderateComment(commentId, status);
      fetchComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to moderate comment.');
    } finally {
      setModerating(null);
    }
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setPage(1);
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    border: active ? '1.5px solid #1e3a8a' : '1.5px solid #e2e8f0',
    backgroundColor: active ? '#eff3ff' : '#ffffff',
    color: active ? '#1e3a8a' : '#475569',
    cursor: 'pointer', whiteSpace: 'nowrap',
  });

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: '#94a3b8', marginBottom: '20px',
      }}>
        <span style={{ color: '#475569' }}>Home</span>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>Comment Moderation</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
          Comment Moderation
        </h1>
        {!loading && (
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#475569' }}>
            {total} comment{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filter tabs row + search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '20px', flexWrap: 'wrap',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            style={tabStyle(activeTab === tab.key)}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <input
            style={{
              border: '1px solid #e2e8f0', borderRadius: '8px',
              padding: '8px 12px', fontSize: '13px', color: '#0f172a',
              outline: 'none', backgroundColor: '#ffffff', width: '220px',
            }}
            placeholder="Search comments…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Comment cards */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px',
        }}>
          No comments found.
        </div>
      ) : (
        <>
          {comments.map(c => (
            <CommentCard
              key={c._id}
              comment={c}
              onModerate={handleModerate}
              moderating={moderating}
            />
          ))}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '20px', fontSize: '13px', color: '#475569',
        }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
                border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
                border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
