/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a8a',
          light: '#3b5fc0',
          surface: '#eff3ff',
        },
        accent: '#0d9488',
        background: '#f8fafc',
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f1f5f9',
        },
        border: '#e2e8f0',
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#94a3b8',
        },
        risk: {
          critical: { DEFAULT: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          high:     { DEFAULT: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
          medium:   { DEFAULT: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
          low:      { DEFAULT: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        sidebar: '240px',
        header: '64px',
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        modal: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
