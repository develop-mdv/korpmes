import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useOrganizationStore } from '@/stores/organization.store';
import * as deptsApi from '@/api/departments.api';

type Department = deptsApi.Department;

function DeptNode({
  dept,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  dept: Department;
  depth: number;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onAddChild: (parent: Department) => void;
}) {
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div style={styles.deptRow}>
        <span style={styles.deptName}>
          {depth > 0 && <span style={styles.indent}>└ </span>}
          {dept.name}
        </span>
        {dept.description && <span style={styles.deptDesc}>{dept.description}</span>}
        <div style={styles.deptActions}>
          <button style={styles.actionBtn} onClick={() => onAddChild(dept)} title="Add sub-department">
            +
          </button>
          <button style={styles.actionBtn} onClick={() => onEdit(dept)} title="Edit">
            ✎
          </button>
          <button
            style={{ ...styles.actionBtn, color: 'var(--color-error)' }}
            onClick={() => onDelete(dept)}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
      {dept.children?.map((child) => (
        <DeptNode
          key={child.id}
          dept={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

interface FormState {
  name: string;
  description: string;
}

export function DepartmentsPage() {
  const { currentOrg } = useOrganizationStore();
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [parentTarget, setParentTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const data = await deptsApi.listDepartments(currentOrg.id);
      setDepts(data);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openCreate = (parent?: Department) => {
    setEditTarget(null);
    setParentTarget(parent ?? null);
    setForm({ name: '', description: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setParentTarget(null);
    setForm({ name: dept.name, description: dept.description ?? '' });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = useCallback(
    async (dept: Department) => {
      if (!currentOrg) return;
      if (!confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;
      await deptsApi.deleteDepartment(currentOrg.id, dept.id);
      await reload();
    },
    [currentOrg, reload],
  );

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Department name is required');
      return;
    }
    if (!currentOrg) return;
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await deptsApi.updateDepartment(currentOrg.id, editTarget.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
      } else {
        await deptsApi.createDepartment(currentOrg.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          parentDepartmentId: parentTarget?.id,
        });
      }
      setModalOpen(false);
      await reload();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Departments</h1>
        <button style={styles.createBtn} onClick={() => openCreate()}>
          + New Department
        </button>
      </div>

      {loading && (
        <div style={styles.centered}>
          <LoadingSpinner />
        </div>
      )}

      {!loading && depts.length === 0 && (
        <EmptyState
          title="No departments yet"
          description="Create departments to organize your teams"
        />
      )}

      {!loading && depts.length > 0 && (
        <div style={styles.tree}>
          {depts.map((dept) => (
            <DeptNode
              key={dept.id}
              dept={dept}
              depth={0}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddChild={(parent) => openCreate(parent)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Department' : parentTarget ? `Add sub-department to "${parentTarget.name}"` : 'New Department'}
      >
        <div style={styles.form}>
          <label style={styles.label}>
            Name *
            <input
              style={styles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Engineering"
              autoFocus
            />
          </label>
          <label style={styles.label}>
            Description
            <input
              style={styles.input}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </label>
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.modalActions}>
            <button style={styles.cancelBtn} onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 720, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' },
  createBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primary)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  centered: { display: 'flex', justifyContent: 'center', paddingTop: 40 },
  tree: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 16,
  },
  deptRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid var(--color-border)',
  },
  deptName: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)', flex: '0 0 auto' },
  indent: { color: 'var(--color-text-tertiary)' },
  deptDesc: {
    flex: 1,
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deptActions: { display: 'flex', gap: 4, marginLeft: 'auto' },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 4,
    border: '1px solid var(--color-border)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' },
  input: {
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    outline: 'none',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
  },
  error: { color: 'var(--color-error)', fontSize: 13, margin: 0 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
  },
  saveBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primary)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
};
