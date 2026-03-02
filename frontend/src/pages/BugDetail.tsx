import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBug, updateBug, deleteBug, getComments, addComment, getUsers, getProjects } from '../api';
import type { Bug, Comment, User, Project } from '../types';
import Badge from '../components/Badge';

export default function BugDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bugId = Number(id);

  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Bug>>({});
  const [saveError, setSaveError] = useState('');

  const [commentContent, setCommentContent] = useState('');
  const [commentUserId, setCommentUserId] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    Promise.all([getBug(bugId), getComments(bugId), getUsers(), getProjects()])
      .then(([b, c, u, p]) => {
        setBug(b);
        setEditData(b);
        setComments(c);
        setUsers(u);
        setProjects(p);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bugId]);

  const projectName = (pid: number) => projects.find((p) => p.id === pid)?.name ?? `#${pid}`;
  const userName = (uid: number | null) => {
    if (!uid) return '—';
    return users.find((u) => u.id === uid)?.name ?? `#${uid}`;
  };

  async function handleSave() {
    setSaveError('');
    try {
      const updated = await updateBug(bugId, {
        title: editData.title,
        description: editData.description,
        status: editData.status,
        priority: editData.priority,
        severity: editData.severity,
        assignee_id: editData.assignee_id,
      });
      setBug(updated);
      setEditData(updated);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this bug?')) return;
    await deleteBug(bugId);
    navigate('/');
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

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!bug) return <p className="error">Bug not found</p>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => navigate(-1)}>← Back</button>
        <div className="header-actions">
          {!editing && (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          )}
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="bug-detail-card">
        {editing ? (
          <div className="edit-form">
            <h2>Edit Bug #{bug.id}</h2>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={editData.title ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={4}
                value={editData.description ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editData.status ?? ''}
                  onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value as Bug['status'] }))}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={editData.priority ?? ''}
                  onChange={(e) => setEditData((d) => ({ ...d, priority: e.target.value as Bug['priority'] }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Severity</label>
                <select
                  value={editData.severity ?? ''}
                  onChange={(e) => setEditData((d) => ({ ...d, severity: e.target.value as Bug['severity'] }))}
                >
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
                  onChange={(e) => setEditData((d) => ({
                    ...d,
                    assignee_id: e.target.value ? Number(e.target.value) : null,
                  }))}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            {saveError && <p className="error">{saveError}</p>}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
              <button className="btn btn-secondary" onClick={() => { setEditing(false); setEditData(bug); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h2>#{bug.id} — {bug.title}</h2>
            <div className="bug-meta">
              <span>Project: <strong>{projectName(bug.project_id)}</strong></span>
              <span>Reporter: <strong>{userName(bug.reporter_id)}</strong></span>
              <span>Assignee: <strong>{userName(bug.assignee_id)}</strong></span>
              <span>Status: <Badge value={bug.status} type="status" /></span>
              <span>Priority: <Badge value={bug.priority} type="priority" /></span>
              <span>Severity: <Badge value={bug.severity} type="severity" /></span>
            </div>
            <div className="bug-dates">
              <small>Created: {new Date(bug.created_at).toLocaleString()}</small>
              <small>Updated: {new Date(bug.updated_at).toLocaleString()}</small>
            </div>
            {bug.description && (
              <div className="bug-description">
                <h3>Description</h3>
                <p>{bug.description}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="comments-section">
        <h3>Comments ({comments.length})</h3>
        {comments.length === 0 && <p style={{ color: '#888' }}>No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="comment-card">
            <div className="comment-header">
              <strong>{c.author_name}</strong>
              <small>{new Date(c.created_at).toLocaleString()}</small>
            </div>
            <p>{c.content}</p>
          </div>
        ))}

        <form className="comment-form" onSubmit={handleAddComment}>
          <h4>Add Comment</h4>
          <div className="form-group">
            <label>User</label>
            <select
              value={commentUserId}
              onChange={(e) => setCommentUserId(e.target.value)}
              required
            >
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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submittingComment}
          >
            {submittingComment ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}
