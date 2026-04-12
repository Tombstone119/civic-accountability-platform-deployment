import React from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
  },
  secondary: {
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    border: '1px solid #1e3a8a',
  },
  destructive: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#475569',
    border: '1px solid #e2e8f0',
  },
};

const variantHover: Record<Variant, string> = {
  primary:     '#3b5fc0',
  secondary:   '#eff3ff',
  destructive: '#b91c1c',
  ghost:       '#f8fafc',
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { fontSize: '12px', padding: '5px 12px', height: '30px' },
  md: { fontSize: '14px', padding: '8px 16px', height: '36px' },
  lg: { fontSize: '14px', padding: '10px 20px', height: '42px' },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      const bg = variantHover[variant];
      if (variant === 'secondary') {
        e.currentTarget.style.backgroundColor = bg;
      } else if (variant === 'ghost') {
        e.currentTarget.style.backgroundColor = bg;
      } else {
        e.currentTarget.style.backgroundColor = bg;
      }
    }
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.backgroundColor =
        variantStyles[variant].backgroundColor as string;
    }
    onMouseLeave?.(e);
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: '8px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background-color 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading ? (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : icon}
      {children}
    </button>
  );
}
