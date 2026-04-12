import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

const config: Record<AlertType, { bg: string; text: string; border: string; Icon: typeof Info }> = {
  info:    { bg: '#eff6ff', text: '#2563eb', border: '#2563eb', Icon: Info },
  success: { bg: '#f0fdf4', text: '#16a34a', border: '#16a34a', Icon: CheckCircle },
  warning: { bg: '#fefce8', text: '#ca8a04', border: '#ca8a04', Icon: AlertTriangle },
  error:   { bg: '#fef2f2', text: '#dc2626', border: '#dc2626', Icon: XCircle },
};

interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
}

export default function Alert({ type = 'info', title, message, onClose }: AlertProps) {
  const c = config[type];
  const { Icon } = c;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '8px',
        borderLeft: `4px solid ${c.border}`,
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1 }}>
        {title && (
          <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 2px 0' }}>{title}</p>
        )}
        <p style={{ fontSize: '14px', margin: 0 }}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: c.text,
            padding: 0,
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
