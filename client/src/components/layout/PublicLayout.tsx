import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function PublicLayout() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Minimal public header */}
      <header
        className="border-b"
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        <div
          className="flex items-center justify-between px-6"
          style={{ maxWidth: '1200px', margin: '0 auto', height: '64px' }}
        >
          <Link
            to="/portal"
            className="flex items-center gap-2.5 no-underline"
            style={{ textDecoration: 'none' }}
          >
            <ShieldCheck size={22} style={{ color: '#1e3a8a' }} />
            <span className="font-semibold" style={{ color: '#1e3a8a', fontSize: '16px' }}>
              VeriTrack
            </span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium"
            style={{ color: '#475569', textDecoration: 'none' }}
          >
            Staff Login →
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
