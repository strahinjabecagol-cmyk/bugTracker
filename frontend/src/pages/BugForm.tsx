import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBug, getProjects, getUsers } from '../api';
import type { Project, User } from '../types';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import SidebarDropdown from '../components/SidebarDropdown';

export default function BugForm() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProject();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(selectedProjectId);
  const [reporterId, setReporterId] = useState('');
  const [type, setType] = useState<'bug' | 'task'>('bug');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [severity, setSeverity] = useState<'minor' | 'major' | 'critical' | 'blocker'>('major');
  const [assigneeId, setAssigneeId] = useState('');

  const [images, setImages] = useState<string[]>([]);
  const [confirmRemoveImage, setConfirmRemoveImage] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    Promise.all([getProjects(), getUsers()]).then(([p, u]) => {
      setProjects(p);
      setUsers(u);
      if (authUser?.id) setReporterId(String(authUser.id));
    });
  }, [authUser?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !reporterId) {
      setError('Project and Reporter are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const bug = await createBug({
        project_id: Number(projectId),
        title,
        description,
        type,
        priority,
        severity,
        reporter_id: Number(reporterId),
        assignee_id: assigneeId ? Number(assigneeId) : null,
        images,
      });
      navigate(`/bugs/${bug.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page bug-form-page">
      <form onSubmit={handleSubmit}>
        <div className="page-header">
          <h1 className="board-heading detail-heading">
            <span>
              <input
                className="header-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                placeholder="New item title..."
              />
            </span>
          </h1>
          <div className="header-actions">
            <button type="submit" className="btn btn-primary board-btn" disabled={submitting}>
              <span>{submitting ? 'Creating...' : 'Create Item'}</span>
            </button>
            <button type="button" className="btn btn-secondary board-btn" onClick={() => navigate(-1)}>
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div className="detail-card">
          <div className="detail-card-body">
            <div className="detail-card-main">
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ maxWidth: '220px', flex: 1 }}>
                  <SidebarDropdown
                    label="Project *"
                    value={projectId as string}
                    options={[{ value: '', label: 'Select project...' }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
                    onChange={(v) => setProjectId(v)}
                  />
                </div>
                <div style={{ maxWidth: '160px', flex: 1 }}>
                  <SidebarDropdown
                    label="Type"
                    value={type}
                    options={[{ value: 'bug', label: 'Bug' }, { value: 'task', label: 'Task' }]}
                    onChange={(v) => setType(v as typeof type)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label>Description</label>
                <textarea
                  style={{ flex: 1, resize: 'none', width: '100%' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Steps to reproduce, expected vs actual behavior..."
                />
              </div>
              <div className="form-group">
                <label>Images</label>
                {images.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {images.map((src, i) => (
                      <div key={i} style={{ position: 'relative', width: 120, height: 75, flexShrink: 0 }}>
                        <img src={src} alt="" style={{ width: 120, height: 75, objectFit: 'cover', borderRadius: 4, border: '1px solid #334155', display: 'block' }} />
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveImage(i)}
                          style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', lineHeight: 1, padding: 0, fontSize: '1rem' }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id="form-img-input"
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }}
                />
                <button type="button" className="btn-logout" style={{ width: 'fit-content' }} onClick={() => document.getElementById('form-img-input')?.click()}>
                  <span>Attach Images</span>
                </button>
              </div>
            </div>

            <div className="detail-card-sidebar">
              {isAdmin ? (
                <SidebarDropdown
                  label="Reporter *"
                  value={reporterId}
                  options={[{ value: '', label: 'Select reporter...' }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]}
                  onChange={(v) => setReporterId(v)}
                />
              ) : (
                <div className="form-group">
                  <label>Reporter</label>
                  <div className="sidebar-readonly">
                    {users.find((u) => String(u.id) === reporterId)?.name ?? '—'}
                  </div>
                </div>
              )}
              <SidebarDropdown
                label="Assignee"
                value={assigneeId}
                options={[{ value: '', label: 'Unassigned' }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]}
                onChange={(v) => setAssigneeId(v)}
              />
              <SidebarDropdown
                label="Priority"
                value={priority}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
                onChange={(v) => setPriority(v as typeof priority)}
              />
              <SidebarDropdown
                label="Severity"
                value={severity}
                options={[
                  { value: 'minor', label: 'Minor' },
                  { value: 'major', label: 'Major' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'blocker', label: 'Blocker' },
                ]}
                onChange={(v) => setSeverity(v as typeof severity)}
              />
            </div>
          </div>
        </div>
      </form>

      {confirmRemoveImage !== null && (
        <div className="modal-overlay" onClick={() => setConfirmRemoveImage(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠</div>
            <h2>Remove Image</h2>
            <p className="confirm-message">
              Remove this image?
              <br />
              <span className="confirm-sub">This action cannot be undone.</span>
            </p>
            <div className="form-actions">
              <button className="btn btn-danger board-btn" onClick={() => { setImages((prev) => prev.filter((_, j) => j !== confirmRemoveImage)); setConfirmRemoveImage(null); }}><span>Remove</span></button>
              <button className="btn btn-secondary board-btn" onClick={() => setConfirmRemoveImage(null)}><span>Cancel</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
