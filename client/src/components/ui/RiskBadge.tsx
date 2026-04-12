export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const config: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  high:     { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  medium:   { bg: '#fefce8', text: '#ca8a04', border: '#fde68a' },
  low:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

interface RiskBadgeProps {
  level: RiskLevel;
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const key = level.toLowerCase();
  const c = config[key] ?? config.medium;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '2px 8px',
        borderRadius: '4px',
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
        color: c.text,
        whiteSpace: 'nowrap',
      }}
    >
      {key}
    </span>
  );
}
