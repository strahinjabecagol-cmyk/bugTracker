import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBug, updateBug, deleteBug, getComments, addComment, getUsers, getProjects } from '../api';
import type { Bug, Comment, User, Project } from '../types';
import { useAuth } from '../context/AuthContext';
import SidebarDropdown from '../components/SidebarDropdown';

export default function BugDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bugId = Number(id);
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editData, setEditData] = useState<Partial<Bug>>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [commentContent, setCommentContent] = useState('');
  const [commentUserId, setCommentUserId] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    Promise.all([getBug(bugId), getComments(bugId), getUsers(), getProjects()])
      .then(([b, c, u, p]) => {
        setBug(b);
        setEditData(b);
        setComments(c);
        setUsers(u);
        setProjects(p);
        if (authUser?.id) setCommentUserId(String(authUser.id));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bugId, authUser?.id]);

  const projectName = (pid: number) => projects.find((p) => p.id === pid)?.name ?? `#${pid}`;
  const userName = (uid: number | null) => {
    if (!uid) return '—';
    return users.find((u) => u.id === uid)?.name ?? `#${uid}`;
  };

  async function handleSave() {
    setSaveError('');
    setSaving(true);
    try {
      const updated = await updateBug(bugId, {
        title: editData.title,
        description: editData.description,
        type: editData.type,
        status: editData.status,
        priority: editData.priority,
        severity: editData.severity,
        assignee_id: editData.assignee_id,
      });
      setBug(updated);
      setEditData(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    try {
      await deleteBug(bugId);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentUserId || !commentContent.trim()) return;
    setCommentError('');
    setSubmittingComment(true);
    try {
      const c = await addComment(bugId, {
        user_id: Number(commentUserId),
        content: commentContent.trim(),
      });
      setComments((prev) => [...prev, c]);
      setCommentContent('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) return <p className="loading" style={{ padding: '2rem', color: '#94a3b8', background: '#0f172a', minHeight: '100vh', margin: '-2rem' }}>Loading...</p>;
  if (error) return <p className="error" style={{ padding: '2rem' }}>{error}</p>;
  if (!bug) return <p className="error" style={{ padding: '2rem' }}>Item not found</p>;

  return (
    <div className="page bug-detail-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="board-heading detail-heading">
          <span>
            <span className="detail-id">#{bug.id}</span>
            <input
              className="header-title-input"
              type="text"
              value={editData.title ?? ''}
              onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
              placeholder="Item title..."
            />
          </span>
        </h1>
        <div className="header-actions">
          <button className="btn btn-primary board-btn" onClick={handleSave} disabled={saving}>
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
          {isAdmin && (
            <button className="btn btn-danger board-btn" onClick={() => setConfirmDelete(true)}>
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {saveError && <p className="error" style={{ marginBottom: '1rem' }}>{saveError}</p>}

      <div className="detail-card">
        <div className="detail-card-body">
          <div className="detail-card-main">
            <div className="detail-info-row">
              <span>Project:&nbsp;<span className="project-pill"><span>{projectName(bug.project_id)}</span></span></span>
              <span>Reporter:&nbsp;<span className="detail-info-value">{userName(bug.reporter_id)}</span></span>
              <span>Created:&nbsp;<span className="detail-info-value">{new Date(bug.created_at).toLocaleString()}</span></span>
              <span>Updated:&nbsp;<span className="detail-info-value">{new Date(bug.updated_at).toLocaleString()}</span></span>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={8}
                value={editData.description ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                placeholder="Describe the issue or task..."
              />
            </div>
          </div>

          <div className="detail-card-sidebar">
            <SidebarDropdown
              label="Type"
              value={editData.type}
              options={[{ value: 'bug', label: 'Bug' }, { value: 'task', label: 'Task' }]}
              onChange={(v) => setEditData((d) => ({ ...d, type: v as Bug['type'] }))}
            />
            <SidebarDropdown
              label="Status"
              value={editData.status}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
              onChange={(v) => setEditData((d) => ({ ...d, status: v as Bug['status'] }))}
            />
            <SidebarDropdown
              label="Priority"
              value={editData.priority}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
              onChange={(v) => setEditData((d) => ({ ...d, priority: v as Bug['priority'] }))}
            />
            <SidebarDropdown
              label="Severity"
              value={editData.severity}
              options={[
                { value: 'minor', label: 'Minor' },
                { value: 'major', label: 'Major' },
                { value: 'critical', label: 'Critical' },
                { value: 'blocker', label: 'Blocker' },
              ]}
              onChange={(v) => setEditData((d) => ({ ...d, severity: v as Bug['severity'] }))}
            />
            <SidebarDropdown
              label="Assignee"
              value={editData.assignee_id ? String(editData.assignee_id) : ''}
              options={[{ value: '', label: 'Unassigned' }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]}
              onChange={(v) => setEditData((d) => ({ ...d, assignee_id: v ? Number(v) : null }))}
            />
          </div>
        </div>
      </div>

      <div className="comments-section-dark">
        <h3>Comments ({comments.length})</h3>
        {comments.length === 0 && <p className="no-comments">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="comment-card-dark">
            <div className="comment-header">
              <span className="comment-author">{c.author_name}</span>
              <span className="comment-date">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <p className="comment-content">{c.content}</p>
          </div>
        ))}

        <div className="comment-form-dark">
          <h4>Add Comment</h4>
          <form onSubmit={handleAddComment}>
            <div className="form-group">
              <label>User</label>
              <select value={commentUserId} onChange={(e) => setCommentUserId(e.target.value)} required>
                <option value="">Select user...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Comment</label>
              <textarea
                rows={3}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                required
              />
            </div>
            {commentError && <p className="error">{commentError}</p>}
            <button type="submit" className="btn btn-primary board-btn" disabled={submittingComment}>
              <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </form>
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠</div>
            <h2>Delete Item</h2>
            <p className="confirm-message">
              Delete <span className="confirm-name">#{bug.id}</span>?
              <br />
              <span className="confirm-sub">This action cannot be undone.</span>
            </p>
            <div className="form-actions">
              <button className="btn btn-danger board-btn" onClick={handleDelete}><span>Delete</span></button>
              <button className="btn btn-secondary board-btn" onClick={() => setConfirmDelete(false)}><span>Cancel</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
