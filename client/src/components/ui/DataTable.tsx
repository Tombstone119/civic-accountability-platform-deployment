import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { TableColumn, SortDir } from '../../types';
import Pagination from './Pagination';
import EmptyState from './EmptyState';

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField?: string;
  loading?: boolean;
  // Pagination
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  // Sorting
  sortKey?: string;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
  // Toolbar slot
  toolbar?: React.ReactNode;
  // Empty state
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = '_id',
  loading = false,
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 20,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
  toolbar,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {

  const handleHeaderClick = (col: TableColumn<T>) => {
    if (col.sortable && onSort) onSort(col.key);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#1e3a8a', flexShrink: 0 }} />
      : <ChevronDown size={12} style={{ color: '#1e3a8a', flexShrink: 0 }} />;
  };

  return (
    <div>
      {/* Toolbar */}
      {toolbar && (
        <div style={{ marginBottom: '12px' }}>
          {toolbar}
        </div>
      )}

      {/* Table container */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {/* Header */}
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#475569',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: col.sortable ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      width: col.width,
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading…</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '48px 16px' }}>
                    <EmptyState message={emptyMessage} />
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={String(row[keyField] ?? rowIdx)}
                    style={{
                      backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      minHeight: '52px',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={e =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = '#eff3ff')
                    }
                    onMouseLeave={e =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor =
                        rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc')
                    }
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        style={{
                          padding: '14px 16px',
                          fontSize: '14px',
                          color: '#0f172a',
                          borderBottom: '1px solid #f1f5f9',
                          verticalAlign: 'middle',
                        }}
                      >
                        {col.render
                          ? col.render(row)
                          : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
