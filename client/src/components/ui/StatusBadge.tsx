export type StatusValue =
  | 'draft' | 'active' | 'completed' | 'terminated' | 'under_review'
  | 'pending' | 'processing' | 'failed' | 'planned' | 'in_progress'
  | 'cancelled' | 'approved' | 'rejected' | 'open' | 'resolved' | 'dismissed'
  | 'blacklisted' | 'inactive'
  | string;

interface StatusConfig {
  bg: string;
  text: string;
  label?: string;
}

const config: Record<string, StatusConfig> = {
  draft:        { bg: '#f1f5f9', text: '#64748b' },
  active:       { bg: '#eff6ff', text: '#2563eb' },
  completed:    { bg: '#f0fdf4', text: '#16a34a' },
  terminated:   { bg: '#fef2f2', text: '#dc2626' },
  under_review: { bg: '#fefce8', text: '#ca8a04', label: 'Under Review' },
  pending:      { bg: '#fefce8', text: '#ca8a04' },
  processing:   { bg: '#eff6ff', text: '#2563eb' },
  failed:       { bg: '#fef2f2', text: '#dc2626' },
  planned:      { bg: '#f1f5f9', text: '#64748b' },
  in_progress:  { bg: '#eff6ff', text: '#2563eb', label: 'In Progress' },
  cancelled:    { bg: '#fef2f2', text: '#dc2626' },
  approved:     { bg: '#f0fdf4', text: '#16a34a' },
  rejected:     { bg: '#fef2f2', text: '#dc2626' },
  open:         { bg: '#eff6ff', text: '#2563eb' },
  resolved:     { bg: '#f0fdf4', text: '#16a34a' },
  dismissed:    { bg: '#f1f5f9', text: '#64748b' },
  blacklisted:  { bg: '#fef2f2', text: '#dc2626' },
  inactive:     { bg: '#f1f5f9', text: '#64748b' },
};

interface StatusBadgeProps {
  status: StatusValue;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const c = config[key] ?? { bg: '#f1f5f9', text: '#64748b' };
  const displayLabel = c.label ?? key.replace(/_/g, ' ');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: c.bg,
        color: c.text,
        whiteSpace: 'nowrap',
      }}
    >
      {displayLabel}
    </span>
  );
}
