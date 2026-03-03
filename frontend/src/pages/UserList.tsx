import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import type { User } from '../types';
import { useAuth } from '../context/AuthContext';

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
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [modal, setModal] = useState<{ mode: ModalMode; user?: User } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

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

  async function handleDelete() {
    if (!confirmDelete) return;
    const user = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user');
    }
  }

  return (
    <div className="page users-page">
      <div className="page-header">
        <h1 className="board-heading"><span>Users</span></h1>
        {isAdmin && <button className="btn btn-primary board-btn" onClick={openCreate}><span>+ New User</span></button>}
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
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', color: '#64748b' }}>No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`badge badge-role badge-${u.role}`}><span>{u.role}</span></span></td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                {isAdmin && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" onClick={() => openEdit(u)}><span>Edit</span></button>
                      <button className="btn btn-danger" onClick={() => setConfirmDelete(u)}><span>Delete</span></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠</div>
            <h2>Delete User</h2>
            <p className="confirm-message">
              Delete <span className="confirm-name">{confirmDelete.name}</span>?
              <br />
              <span className="confirm-sub">This action cannot be undone.</span>
            </p>
            <div className="form-actions">
              <button className="btn btn-danger board-btn" onClick={handleDelete}><span>Delete</span></button>
              <button className="btn btn-secondary board-btn" onClick={() => setConfirmDelete(null)}><span>Cancel</span></button>
            </div>
          </div>
        </div>
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
                <button type="submit" className="btn btn-primary board-btn" disabled={submitting}>
                  <span>{submitting ? 'Saving...' : modal.mode === 'create' ? 'Create' : 'Save'}</span>
                </button>
                <button type="button" className="btn btn-secondary board-btn" onClick={closeModal}><span>Cancel</span></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
