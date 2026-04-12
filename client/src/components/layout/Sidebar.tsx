import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Building2,
  CreditCard,
  ClipboardList,
  Landmark,
  BarChart3,
  Users,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: <LayoutDashboard size={16} />,
        roles: ['admin', 'procurement_officer', 'auditor', 'viewer'],
      },
    ],
  },
  {
    title: 'Procurement',
    items: [
      {
        label: 'Contracts',
        to: '/contracts',
        icon: <FileText size={16} />,
        roles: ['admin', 'procurement_officer', 'auditor', 'viewer'],
      },
      {
        label: 'Vendors',
        to: '/vendors',
        icon: <Building2 size={16} />,
        roles: ['admin', 'procurement_officer', 'auditor', 'viewer'],
      },
      {
        label: 'Payments',
        to: '/payments',
        icon: <CreditCard size={16} />,
        roles: ['admin', 'procurement_officer', 'auditor', 'viewer'],
      },
    ],
  },
  {
    title: 'Audit',
    items: [
      {
        label: 'Audit Reports',
        to: '/audits',
        icon: <ClipboardList size={16} />,
        roles: ['admin', 'procurement_officer', 'auditor', 'viewer'],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Departments',
        to: '/departments',
        icon: <Landmark size={16} />,
        roles: ['admin', 'procurement_officer', 'auditor', 'viewer'],
      },
      {
        label: 'Spending',
        to: '/spending',
        icon: <BarChart3 size={16} />,
        roles: ['admin', 'procurement_officer', 'auditor', 'viewer'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Users',
        to: '/users',
        icon: <Users size={16} />,
        roles: ['admin'],
      },
      {
        label: 'Comments',
        to: '/moderation',
        icon: <MessageSquare size={16} />,
        roles: ['admin'],
      },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <aside
      className="flex-shrink-0 flex flex-col overflow-y-auto scrollbar-thin"
      style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
      }}
    >
      <nav className="flex-1 py-4">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(item =>
            item.roles.includes(user.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="mb-2">
              <p
                className="px-4 pb-1 font-medium uppercase tracking-wider"
                style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}
              >
                {group.title}
              </p>
              {visibleItems.map(item => {
                const isActive =
                  item.to === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: isActive ? '#1e3a8a' : '#475569',
                      backgroundColor: isActive ? '#eff3ff' : 'transparent',
                      borderLeft: isActive ? '3px solid #1e3a8a' : '3px solid transparent',
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
