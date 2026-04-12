import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, id, style, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#475569',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        style={{
          width: '100%',
          border: `1px solid ${error ? '#dc2626' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          color: '#0f172a',
          backgroundColor: '#ffffff',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...style,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = error ? '#dc2626' : '#1e3a8a';
          e.currentTarget.style.boxShadow = error
            ? '0 0 0 2px #fef2f2'
            : '0 0 0 2px #eff3ff';
          props.onFocus?.(e);
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? '#dc2626' : '#e2e8f0';
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
      {error && (
        <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{error}</p>
      )}
      {hint && !error && (
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{hint}</p>
      )}
    </div>
  );
}


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, hint, id, options, placeholder, style, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#475569',
          }}
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        {...props}
        style={{
          width: '100%',
          border: `1px solid ${error ? '#dc2626' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          color: '#0f172a',
          backgroundColor: '#ffffff',
          outline: 'none',
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...style,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#1e3a8a';
          e.currentTarget.style.boxShadow = '0 0 0 2px #eff3ff';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? '#dc2626' : '#e2e8f0';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{error}</p>
      )}
      {hint && !error && (
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{hint}</p>
      )}
    </div>
  );
}
