import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBug, getProjects, getUsers } from '../api';
import type { Project, User } from '../types';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

export default function BugForm() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProject();
  const { user: authUser } = useAuth();
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
                <div className="form-group" style={{ maxWidth: '220px' }}>
                  <label>Project *</label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                    <option value="">Select project...</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ maxWidth: '160px' }}>
                  <label>Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                    <option value="bug">Bug</option>
                    <option value="task">Task</option>
                  </select>
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
            </div>

            <div className="detail-card-sidebar">
              <div className="form-group">
                <label>Reporter *</label>
                <select value={reporterId} onChange={(e) => setReporterId(e.target.value)} required>
                  <option value="">Select reporter...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assignee</label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                  <option value="blocker">Blocker</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
