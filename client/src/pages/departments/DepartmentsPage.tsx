import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Check, X as XIcon } from 'lucide-react';
import { departmentService } from '../../services/departmentService';
import { useAuth } from '../../context/AuthContext';
import type { Department } from '../../types';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
};

interface DeptFormState {
  name: string;
  code: string;
  budget: string;
  headOfDepartment: string;
  description: string;
  isActive: boolean;
  fiscalYear: string;
}

const defaultForm: DeptFormState = {
  name: '',
  code: '',
  budget: '',
  headOfDepartment: '',
  description: '',
  isActive: true,
  fiscalYear: String(new Date().getFullYear()),
};

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<DeptFormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canWrite = user?.role === 'admin';

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await departmentService.list({ limit: 100 });
      setDepartments(res.data);
      setTotal(res.pagination.total);
    } catch {
      setError('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setDrawerOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      budget: String(dept.budget),
      headOfDepartment: dept.headOfDepartment ?? '',
      description: dept.description ?? '',
      isActive: dept.isActive,
      fiscalYear: String(dept.fiscalYear),
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code) {
      setError('Name and code are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: Partial<Department> = {
        name: form.name,
        code: form.code,
        budget: parseFloat(form.budget) || 0,
        headOfDepartment: form.headOfDepartment || undefined,
        description: form.description || undefined,
        isActive: form.isActive,
        fiscalYear: parseInt(form.fiscalYear) || new Date().getFullYear(),
      };
      if (editTarget) {
        await departmentService.update(editTarget._id, payload);
        setSuccessMsg('Department updated successfully.');
      } else {
        await departmentService.create(payload);
        setSuccessMsg('Department created successfully.');
      }
      setDrawerOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchDepartments();
    } catch {
      setError(editTarget ? 'Failed to update department.' : 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await departmentService.delete(deleteTarget._id);
      setDeleteTarget(null);
      setSuccessMsg('Department deleted.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchDepartments();
    } catch {
      setError('Failed to delete department.');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
        <span style={{ cursor: 'pointer', color: '#1e3a8a' }} onClick={() => navigate('/')}>
          Home
        </span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>Departments</span>
      </nav>

      {/* Alerts */}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      )}
      {successMsg && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Government Departments</h1>
          <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0' }}>
            {loading ? 'Loading...' : `${total} department${total !== 1 ? 's' : ''} managed`}
          </p>
        </div>
        {canWrite && (
          <Button variant="primary" size="md" onClick={openCreate} icon={<Plus size={14} />}>
            Add Department
          </Button>
        )}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                {['Code', 'Name', 'Budget', 'Head of Dept', 'Contracts', 'Users', 'Active', 'Created', 'Actions'].map(col => (
                  <th
                    key={col}
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#475569',
                      textAlign: col === 'Budget' ? 'right' : (col === 'Contracts' || col === 'Users' || col === 'Active') ? 'center' : 'left',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    Loading departments...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    No departments found.
                  </td>
                </tr>
              ) : (
                departments.map((dept, idx) => (
                  <tr
                    key={dept._id}
                    style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff3ff')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc')}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {dept.code}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a', cursor: 'pointer' }}
                        onClick={() => openEdit(dept)}
                      >
                        {dept.name}
                      </span>
                      {dept.description && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          {dept.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0f172a', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {formatCurrency(dept.budget)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {dept.headOfDepartment || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                      —
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                      —
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {dept.isActive ? (
                        <Check size={15} style={{ color: '#16a34a', display: 'inline-block' }} />
                      ) : (
                        <XIcon size={15} style={{ color: '#dc2626', display: 'inline-block' }} />
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {formatDate(dept.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {canWrite && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(dept); }}
                            title="Edit"
                            style={{
                              background: 'none',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#475569',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1e3a8a'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTarget(dept); }}
                            title="Delete"
                            style={{
                              background: 'none',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#475569',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? 'Edit Department' : 'Add Department'}
        width={480}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleSubmit} loading={submitting}>
              {editTarget ? 'Save Changes' : 'Create Department'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Department Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ministry of Health"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Department Code <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. MOH"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Budget ($)</label>
            <input
              type="number"
              value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              placeholder="0"
              min="0"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Fiscal Year</label>
            <input
              type="number"
              value={form.fiscalYear}
              onChange={e => setForm(f => ({ ...f, fiscalYear: e.target.value }))}
              placeholder={String(new Date().getFullYear())}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Head of Department</label>
            <input
              value={form.headOfDepartment}
              onChange={e => setForm(f => ({ ...f, headOfDepartment: e.target.value }))}
              placeholder="Full name"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this department..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
            />
          </div>

          {/* Is Active toggle */}
          <div>
            <label style={labelStyle}>Active Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: form.isActive ? '#1e3a8a' : '#e2e8f0',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: form.isActive ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
              <span style={{ fontSize: '14px', color: form.isActive ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Department"
        maxWidth={440}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="md" onClick={handleDelete} loading={deleting}>Delete</Button>
          </>
        }
      >
        <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
          Are you sure you want to delete{' '}
          <strong style={{ color: '#0f172a' }}>{deleteTarget?.name}</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
