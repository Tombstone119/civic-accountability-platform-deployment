import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  procurement_officer: 'Officer',
  auditor: 'Auditor',
  viewer: 'Viewer',
};

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-6"
      style={{ height: '64px', backgroundColor: '#1e3a8a' }}
    >
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <ShieldCheck size={24} className="text-white" />
        <span className="text-white font-semibold text-lg tracking-tight">
          VeriTrack
        </span>
      </div>

      {/* Right: Role badge + Name + Logout */}
      {user && (
        <div className="flex items-center gap-4">
          <span
            className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
          >
            {roleLabels[user.role] ?? user.role}
          </span>
          <span className="text-white text-sm">{user.name}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
