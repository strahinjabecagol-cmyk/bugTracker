import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, updateProject, deleteProject } from '../api';
import type { Project } from '../types';
import { useAuth } from '../context/AuthContext';

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

  const [modal, setModal] = useState<{ mode: ModalMode; project?: Project } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete project "${project.name}"? This will also delete all its bugs.`)) return;
    try {
      await deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Project</button>
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
              <th>Bugs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No projects yet</td></tr>
            ) : projects.map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td><strong>{p.name}</strong></td>
                <td>{p.description || <em style={{ color: '#888' }}>—</em>}</td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                <td><Link to={`/?project_id=${p.id}`}>View bugs</Link></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-secondary" onClick={() => openEdit(p)}>Edit</button>
                    {isAdmin && <button className="btn btn-danger" onClick={() => handleDelete(p)}>Delete</button>}
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
