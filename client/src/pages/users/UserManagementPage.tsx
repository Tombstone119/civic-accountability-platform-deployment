import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import type { User, UserRole } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, { bg: string; color: string; label: string }> = {
  admin: { bg: '#eff3ff', color: '#1e3a8a', label: 'Admin' },
  procurement_officer: { bg: '#f0fdf4', color: '#16a34a', label: 'Procurement Officer' },
  auditor: { bg: '#fff7ed', color: '#ea580c', label: 'Auditor' },
  viewer: { bg: '#f1f5f9', color: '#64748b', label: 'Viewer' },
};

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_BADGE[role] ?? { bg: '#f1f5f9', color: '#64748b', label: role };
  return (
    <span style={{
      backgroundColor: cfg.bg,
      color: cfg.color,
      fontSize: '12px',
      fontWeight: 600,
      padding: '2px 10px',
      borderRadius: '9999px',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface UserModalProps {
  editing: User | null;
  onClose: () => void;
  onSaved: () => void;
}

function UserModal({ editing, onClose, onSaved }: UserModalProps) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    email: editing?.email ?? '',
    role: (editing?.role ?? 'viewer') as UserRole,
    password: '',
    isActive: editing?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!editing && !form.password) { setError('Password is required for new users.'); return; }

    setSaving(true);
    try {
      if (editing) {
        const payload: Partial<User> & { password?: string } = {
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await userService.update(editing._id, payload);
      } else {
        await userService.create({
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
          password: form.password,
        });
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save user.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(15,23,42,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
  };

  const inputStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            {editing ? 'Edit User' : 'Add New User'}
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px' }}>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                color: '#b91c1c', borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <div style={fieldStyle}>
              <label style={labelStyle}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                style={inputStyle}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Jane Smith"
                required
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Email Address <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                style={inputStyle}
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@civic.gov"
                required
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} name="role" value={form.role} onChange={handleChange}>
                <option value="admin">Admin</option>
                <option value="procurement_officer">Procurement Officer</option>
                <option value="auditor">Auditor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Password {editing && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>}
                {!editing && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input
                style={inputStyle}
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={editing ? 'Leave blank to keep current' : 'Set a password'}
                required={!editing}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                style={{ width: '16px', height: '16px', accentColor: '#0d9488', cursor: 'pointer' }}
              />
              <label htmlFor="isActive" style={{ fontSize: '14px', color: '#0f172a', cursor: 'pointer' }}>
                Active account
              </label>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ user, onClose, onDeleted }: { user: User; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    try {
      await userService.delete(user._id);
      onDeleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
      setDeleting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '24px',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Delete User</h2>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#475569' }}>
          Are you sure you want to delete <strong>{user.name}</strong>? This action cannot be undone.
        </p>
        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
            border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting} style={{
            padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
            border: 'none', backgroundColor: '#dc2626', color: '#ffffff',
            cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1,
          }}>
            {deleting ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const LIMIT = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: { page: number; limit: number; search?: string; role?: string } = {
        page,
        limit: LIMIT,
      };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await userService.list(params);
      let data = res.data;

      // client-side status filter since API may not support it
      if (statusFilter === 'active') data = data.filter(u => u.isActive);
      else if (statusFilter === 'inactive') data = data.filter(u => !u.isActive);

      setUsers(data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function handleSaved() {
    setShowAddModal(false);
    setEditingUser(null);
    fetchUsers();
  }

  function handleDeleted() {
    setDeletingUser(null);
    fetchUsers();
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = { padding: '0' };

  const breadcrumbStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', color: '#94a3b8', marginBottom: '20px',
  };

  const headerRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '20px', gap: '12px', flexWrap: 'wrap',
  };

  const filterRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '20px', flexWrap: 'wrap',
  };

  const inputStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0', borderRadius: '8px',
    padding: '8px 12px', fontSize: '14px', color: '#0f172a',
    outline: 'none', backgroundColor: '#ffffff',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%', borderCollapse: 'collapse', fontSize: '14px',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '10px 16px',
    fontSize: '12px', fontWeight: 600, color: '#475569',
    backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
    color: '#0f172a', verticalAlign: 'middle',
  };

  const iconBtnStyle = (color: string): React.CSSProperties => ({
    border: 'none', background: 'none', cursor: 'pointer',
    color, padding: '4px', borderRadius: '6px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={pageStyle}>
      {/* Breadcrumb */}
      <div style={breadcrumbStyle}>
        <span style={{ color: '#475569' }}>Home</span>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>User Management</span>
      </div>

      {/* Header row */}
      <div style={headerRowStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            User Management
          </h1>
          {!loading && (
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#475569' }}>
              {total} user{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#1e3a8a', color: '#ffffff',
              border: 'none', borderRadius: '8px',
              padding: '10px 18px', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            + Add User
          </button>
        )}
      </div>

      {/* Filter row */}
      <div style={filterRowStyle}>
        <input
          style={{ ...inputStyle, minWidth: '220px', flex: 1 }}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          style={{ ...inputStyle, minWidth: '150px' }}
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="procurement_officer">Procurement Officer</option>
          <option value="auditor">Auditor</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          style={{ ...inputStyle, minWidth: '130px' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Table card */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px',
        border: '1px solid #e2e8f0', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No users found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Created</th>
                  {isAdmin && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Name with avatar */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          backgroundColor: '#1e3a8a', color: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {getInitials(u.name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ ...tdStyle, color: '#475569' }}>{u.email}</td>

                    {/* Role badge */}
                    <td style={tdStyle}><RoleBadge role={u.role} /></td>

                    {/* Status */}
                    <td style={tdStyle}>
                      {u.isActive ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontSize: '13px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#dcfce7',
                          }}>✓</span>
                          Active
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626', fontSize: '13px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fee2e2',
                          }}>✕</span>
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Created date */}
                    <td style={{ ...tdStyle, color: '#475569', whiteSpace: 'nowrap' }}>
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          style={iconBtnStyle('#1e3a8a')}
                          title="Edit user"
                          onClick={() => setEditingUser(u)}
                        >
                          {/* pencil icon */}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          style={{ ...iconBtnStyle('#dc2626'), marginLeft: '4px' }}
                          title="Delete user"
                          onClick={() => setDeletingUser(u)}
                        >
                          {/* trash icon */}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: '1px solid #e2e8f0',
            fontSize: '13px', color: '#475569',
          }}>
            <span>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '13px',
                  border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '13px',
                  border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showAddModal || editingUser) && (
        <UserModal
          editing={editingUser}
          onClose={() => { setShowAddModal(false); setEditingUser(null); }}
          onSaved={handleSaved}
        />
      )}
      {deletingUser && (
        <DeleteModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
