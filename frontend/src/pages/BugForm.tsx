import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBug, getProjects, getUsers } from '../api';
import type { Project, User } from '../types';
import { useProject } from '../context/ProjectContext';

export default function BugForm() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(selectedProjectId);
  const [reporterId, setReporterId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [severity, setSeverity] = useState<'minor' | 'major' | 'critical' | 'blocker'>('major');
  const [assigneeId, setAssigneeId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getProjects(), getUsers()]).then(([p, u]) => {
      setProjects(p);
      setUsers(u);
    });
  }, []);

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
        priority,
        severity,
        reporter_id: Number(reporterId),
        assignee_id: assigneeId ? Number(assigneeId) : null,
      });
      navigate(`/bugs/${bug.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create bug');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="form-card">
        <h2>New Bug</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Short, descriptive title"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, expected vs actual behavior..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Project *</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                <option value="">Select project...</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

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
          </div>

          <div className="form-row">
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

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Bug'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
