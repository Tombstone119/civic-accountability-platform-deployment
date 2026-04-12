import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumb, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '24px',
        gap: '16px',
      }}
    >
      <div>
        {breadcrumb && (
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 4px 0' }}>
            {breadcrumb}
          </p>
        )}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
