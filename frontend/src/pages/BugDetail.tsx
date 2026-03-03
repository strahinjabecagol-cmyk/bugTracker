import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBug, updateBug, deleteBug, getComments, addComment, getUsers, getProjects } from '../api';
import type { Bug, Comment, User, Project } from '../types';
import { useAuth } from '../context/AuthContext';

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
            <div className="form-group">
              <label>Type</label>
              <select value={editData.type ?? 'bug'} onChange={(e) => setEditData((d) => ({ ...d, type: e.target.value as Bug['type'] }))}>
                <option value="bug">Bug</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={editData.status ?? ''} onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value as Bug['status'] }))}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={editData.priority ?? ''} onChange={(e) => setEditData((d) => ({ ...d, priority: e.target.value as Bug['priority'] }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label>Severity</label>
              <select value={editData.severity ?? ''} onChange={(e) => setEditData((d) => ({ ...d, severity: e.target.value as Bug['severity'] }))}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
                <option value="blocker">Blocker</option>
              </select>
            </div>
            <div className="form-group">
              <label>Assignee</label>
              <select
                value={editData.assignee_id ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, assignee_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
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
