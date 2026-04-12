import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
}

export default function StatCard({ label, value, icon, trend, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 4px 6px -1px rgb(0 0 0 / 0.1)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Icon */}
      <div style={{ color: '#1e3a8a', marginBottom: '12px' }}>{icon}</div>

      {/* Value */}
      <div
        style={{
          fontSize: '36px',
          fontWeight: 700,
          color: '#1e3a8a',
          lineHeight: 1.1,
          marginBottom: '4px',
        }}
      >
        {value}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#94a3b8',
        }}
      >
        {label}
      </div>

      {/* Trend */}
      {trend && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            fontWeight: 500,
            color:
              trend.direction === 'up'
                ? '#16a34a'
                : trend.direction === 'down'
                ? '#dc2626'
                : '#94a3b8',
          }}
        >
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
          {trend.value}
        </div>
      )}
    </div>
  );
}
