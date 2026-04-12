import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Build page numbers to show
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 6px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    color: '#475569',
    transition: 'background-color 0.1s',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '16px',
      }}
    >
      {/* Record count */}
      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
        Showing {from}–{to} of {total} records
      </span>

      {/* Page buttons */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#94a3b8' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              style={{
                ...btnBase,
                backgroundColor: p === page ? '#1e3a8a' : '#ffffff',
                color: p === page ? '#ffffff' : '#475569',
                borderColor: p === page ? '#1e3a8a' : '#e2e8f0',
              }}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{ ...btnBase, opacity: page === totalPages ? 0.4 : 1 }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
