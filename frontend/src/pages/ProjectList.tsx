import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject, updateProject, deleteProject } from '../api';
import type { Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';

type ModalMode = 'create' | 'edit';

interface FormState {
  name: string;
  description: string;
}

const emptyForm: FormState = { name: '', description: '' };

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  const { setSelectedProjectId } = useProject();
  const navigate = useNavigate();

  const [modal, setModal] = useState<{ mode: ModalMode; project?: Project } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setModal({ mode: 'create' });
  }

  function openEdit(project: Project) {
    setForm({ name: project.name, description: project.description ?? '' });
    setFormError('');
    setModal({ mode: 'edit', project });
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
        const created = await createProject({ name: form.name, description: form.description });
        setProjects((prev) => [...prev, created]);
      } else if (modal?.mode === 'edit' && modal.project) {
        const updated = await updateProject(modal.project.id, { name: form.name, description: form.description });
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
    const project = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project');
    }
  }

  return (
    <div className="page projects-page">
      <div className="page-header">
        <h1 className="board-heading"><span>Projects</span></h1>
        <Button variant="primary" onClick={openCreate}>+ New Project</Button>
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
              <th>Description</th>
              <th>Created</th>
              <th>Items</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No projects yet</td></tr>
            ) : projects.map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td><span className="project-pill"><span>{p.name}</span></span></td>
                <td>{p.description || <em style={{ color: '#64748b' }}>—</em>}</td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                <td><button className="btn-link" onClick={() => { setSelectedProjectId(String(p.id)); navigate('/'); }}>View items</button></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Button variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
                    {isAdmin && <Button variant="danger" onClick={() => setConfirmDelete(p)}>Delete</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Project"
          message={<>Delete <span className="confirm-name">{confirmDelete.name}</span>?<br /><span className="confirm-sub">This will also delete all its bugs.</span></>}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? 'New Project' : 'Edit Project'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                  placeholder="Project name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="form-actions">
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Saving...' : modal.mode === 'create' ? 'Create' : 'Save'}</Button>
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
