import { Inbox } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title = 'No records found',
  message,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
        {icon ?? <Inbox size={48} />}
      </div>
      <p style={{ fontSize: '16px', fontWeight: 600, color: '#475569', margin: '0 0 4px 0' }}>
        {title}
      </p>
      {message && (
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 16px 0', maxWidth: '320px' }}>
          {message}
        </p>
      )}
      {action}
    </div>
  );
}
