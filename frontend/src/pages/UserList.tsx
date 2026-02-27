import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import type { User } from '../types';

type ModalMode = 'create' | 'edit';

interface FormState {
  name: string;
  email: string;
  role: User['role'];
}

const emptyForm: FormState = { name: '', email: '', role: 'developer' };

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState<{ mode: ModalMode; user?: User } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setModal({ mode: 'create' });
  }

  function openEdit(user: User) {
    setForm({ name: user.name, email: user.email, role: user.role });
    setFormError('');
    setModal({ mode: 'edit', user });
  }

  function closeModal() {
    setModal(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (modal?.mode === 'create') {
        const created = await createUser({ name: form.name, email: form.email, role: form.role });
        setUsers((prev) => [...prev, created]);
      } else if (modal?.mode === 'edit' && modal.user) {
        const updated = await updateUser(modal.user.id, { name: form.name, email: form.email, role: form.role });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
      closeModal();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Users</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New User</button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td><span className={`badge badge-role-${u.role}`}>{u.role}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-secondary" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(u)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? 'New User' : 'Edit User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                  placeholder="Full name"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="email@example.com"
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as User['role'] }))}
                >
                  <option value="developer">developer</option>
                  <option value="tester">tester</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : modal.mode === 'create' ? 'Create' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
