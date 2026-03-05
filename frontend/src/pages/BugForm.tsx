import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBug, getProjects, getUsers, getBugs, addLink } from '../api';
import type { Bug, Project, User } from '../types';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import SidebarDropdown from '../components/SidebarDropdown';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/Badge';
import SearchBox from '../components/SearchBox';
import type { SearchBoxItem } from '../components/SearchBox';

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

  const [allBugs, setAllBugs] = useState<Bug[]>([]);
  const [pendingLinks, setPendingLinks] = useState<SearchBoxItem[]>([]);

  const [images, setImages] = useState<string[]>([]);
  const [confirmRemoveImage, setConfirmRemoveImage] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    Promise.all([getProjects(), getUsers(), getBugs()]).then(([p, u, b]) => {
      setProjects(p);
      setUsers(u);
      setAllBugs(b);
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
      if (pendingLinks.length > 0) {
        await Promise.all(pendingLinks.map((l) => addLink(bug.id, l.id)));
      }
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
            <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Item'}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </div>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div className="detail-card">
          <div className="detail-card-body">
            <div className="detail-card-main">
              <div style={{ display: 'flex', gap: '1rem', marginLeft: '5px' }}>
                <SidebarDropdown
                  label="Project *"
                  value={projectId as string}
                  options={[{ value: '', label: 'Select project...' }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
                  onChange={(v) => setProjectId(v)}
                  className="form-group-inline"
                />
                <SidebarDropdown
                  label="Type"
                  value={type}
                  options={[{ value: 'bug', label: 'Bug' }, { value: 'task', label: 'Task' }]}
                  onChange={(v) => setType(v as typeof type)}
                  badgeType="type"
                  className="form-group-inline"
                />
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
              <div className="form-group" style={{ paddingLeft: '5px' }}>
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
                <Button type="button" variant="ghost" style={{ width: 'fit-content' }} onClick={() => document.getElementById('form-img-input')?.click()}>Attach Images</Button>
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
                badgeType="priority"
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
                badgeType="severity"
              />
            </div>
          </div>

          {projectId && (
            <div className="detail-card-bottom">
              <div className="detail-card-panel">
                <label>Linked Items ({pendingLinks.length})</label>
                <div className="linked-item-list">
                  {pendingLinks.length === 0 && <p className="no-linked-items">No linked items.</p>}
                  {pendingLinks.map((l) => (
                    <div key={l.id} className="linked-item-row">
                      <span className="linked-item-id">#{l.id}</span>
                      <span className="linked-item-title">{l.title}</span>
                      <span className="searchbox-item-badges">
                        <Badge value={l.status} type="status" />
                        <Badge value={l.type} type="type" />
                      </span>
                      <Button variant="ghost" onClick={() => setPendingLinks((prev) => prev.filter((x) => x.id !== l.id))}>×</Button>
                    </div>
                  ))}
                </div>
                <div className="linked-item-search">
                  <SearchBox
                    items={allBugs.filter((b) => b.project_id === Number(projectId)).map((b) => ({ id: b.id, title: b.title, status: b.status, type: b.type, priority: b.priority }))}
                    exclude={pendingLinks.map((l) => l.id)}
                    onSelect={(item) => setPendingLinks((prev) => [...prev, item])}
                    placeholder="Link an item…"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {confirmRemoveImage !== null && (
        <ConfirmModal
          title="Remove Image"
          message={<>Remove this image?<br /><span className="confirm-sub">This action cannot be undone.</span></>}
          confirmLabel="Remove"
          onConfirm={() => { setImages((prev) => prev.filter((_, j) => j !== confirmRemoveImage)); setConfirmRemoveImage(null); }}
          onCancel={() => setConfirmRemoveImage(null)}
        />
      )}
    </div>
  );
}
