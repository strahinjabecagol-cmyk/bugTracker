import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBug, getBugs, updateBug, deleteBug, getComments, addComment, getUsers, getProjects, getCommits, syncCommits, getLinks, addLink, removeLink } from '../api';
import type { Bug, Comment, User, Project, BugCommit, LinkedItem } from '../types';
import { useAuth } from '../context/AuthContext';
import SidebarDropdown from '../components/SidebarDropdown';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/Badge';
import SearchBox from '../components/SearchBox';
import type { SearchBoxItem } from '../components/SearchBox';
import Tabs from '../components/Tabs';
import RiskAssessmentPanel from '../components/RiskAssessmentPanel';

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
  const [editImages, setEditImages] = useState<string[]>([]);
  const [confirmRemoveImage, setConfirmRemoveImage] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [commits, setCommits] = useState<BugCommit[]>([]);
  const [syncing, setSyncing] = useState(false);

  const [links, setLinks] = useState<LinkedItem[]>([]);
  const [allBugs, setAllBugs] = useState<Bug[]>([]);
  const [linkError, setLinkError] = useState('');
  const [confirmRemoveLink, setConfirmRemoveLink] = useState<LinkedItem | null>(null);

  const [activeTab, setActiveTab] = useState('details');

  const [commentContent, setCommentContent] = useState('');
  const [commentUserId, setCommentUserId] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    Promise.all([getBug(bugId), getComments(bugId), getUsers(), getProjects(), getCommits(bugId), getLinks(bugId), getBugs()])
      .then(([b, c, u, p, commits, lnks, all]) => {
        setBug(b);
        setEditData(b);
        setEditImages((b.images ?? []).map((img) => img.data_url));
        setComments(c);
        setUsers(u);
        setProjects(p);
        setCommits(commits);
        setLinks(lnks);
        setAllBugs(all);
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
        images: editImages,
      });
      setBug(updated);
      setEditData(updated);
      setEditImages((updated.images ?? []).map((img) => img.data_url));
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

  async function handleSelectLink(item: SearchBoxItem) {
    setLinkError('');
    try {
      const updated = await addLink(bugId, item.id);
      setLinks(updated);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to add link');
    }
  }

  async function handleRemoveLink(linked: LinkedItem) {
    try {
      await removeLink(bugId, linked.bug_id);
      setLinks((prev) => prev.filter((l) => l.id !== linked.id));
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to remove link');
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
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          {isAdmin && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
          )}
        </div>
      </div>

      {saveError && <p className="error" style={{ marginBottom: '1rem' }}>{saveError}</p>}

      <Tabs
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'risk', label: 'Risk Assessment' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'risk' && <RiskAssessmentPanel bug={bug} />}

      {activeTab === 'details' && <div className="detail-card">
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
                rows={16}
                value={editData.description ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                placeholder="Describe the issue or task..."
              />
            </div>
            <div className="form-group" style={{ paddingLeft: '5px' }}>
              <label>Images</label>
              {editImages.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {editImages.map((src, i) => (
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
                id="detail-img-input"
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = () => setEditImages((prev) => [...prev, reader.result as string]);
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="ghost" style={{ width: 'fit-content' }} onClick={() => document.getElementById('detail-img-input')?.click()}>Attach Images</Button>
            </div>
          </div>

          <div className="detail-card-sidebar">
            <SidebarDropdown
              label="Type"
              value={editData.type}
              options={[{ value: 'bug', label: 'Bug' }, { value: 'task', label: 'Task' }]}
              onChange={(v) => setEditData((d) => ({ ...d, type: v as Bug['type'] }))}
              badgeType="type"
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
              badgeType="status"
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
              badgeType="priority"
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
              badgeType="severity"
            />
            <SidebarDropdown
              label="Assignee"
              value={editData.assignee_id ? String(editData.assignee_id) : ''}
              options={[{ value: '', label: 'Unassigned' }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]}
              onChange={(v) => setEditData((d) => ({ ...d, assignee_id: v ? Number(v) : null }))}
            />
          </div>
        </div>

        <div className="detail-card-bottom">
          <div className="detail-card-panel">
            <label>Linked Items ({links.length})</label>
            <div className="linked-item-list">
              {links.length === 0 && <p className="no-linked-items">No linked items.</p>}
              {links.map((l) => (
                <div key={l.id} className="linked-item-row">
                  <span className="linked-item-id" onClick={() => navigate(`/bugs/${l.bug_id}`)}>#{l.bug_id}</span>
                  <span className="linked-item-title">{l.title}</span>
                  <span className="searchbox-item-badges">
                    <Badge value={l.status} type="status" />
                    <Badge value={l.type} type="type" />
                  </span>
                  <Button variant="ghost" onClick={() => setConfirmRemoveLink(l)}>×</Button>
                </div>
              ))}
            </div>
            <div className="linked-item-search">
              <SearchBox
                items={allBugs.filter((b) => b.project_id === bug.project_id).map((b) => ({ id: b.id, title: b.title, status: b.status, type: b.type, priority: b.priority }))}
                exclude={[bugId, ...links.map((l) => l.bug_id)]}
                onSelect={handleSelectLink}
                placeholder="Link an item…"
              />
              {linkError && <p className="error" style={{ marginTop: '0.5rem' }}>{linkError}</p>}
            </div>
          </div>

          <div className="detail-card-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <label style={{ margin: 0 }}>Commits ({commits.length})</label>
              <Button variant="ghost" style={{ width: 'fit-content' }} disabled={syncing} onClick={async () => {
                setSyncing(true);
                await syncCommits().catch(console.error);
                const updated = await getCommits(bugId).catch(() => commits);
                setCommits(updated);
                setSyncing(false);
              }}>{syncing ? 'Syncing...' : 'Sync'}</Button>
            </div>
            {commits.length === 0 && <p className="no-linked-items">No linked commits yet. Mention <strong>#{bug.id}</strong> in a commit message.</p>}
            {commits.map((c) => (
              <div key={c.id} className="comment-card-dark">
                <div className="comment-header">
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.commit_sha.slice(0, 8)}</a>
                  <span className="comment-author" style={{ marginLeft: '0.5rem' }}>{c.author}</span>
                  <span className="comment-date">{new Date(c.committed_at).toLocaleString()}</span>
                </div>
                <p className="comment-content">{c.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {activeTab === 'details' && <div className="comments-section-dark">
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
            <SidebarDropdown
              label="User"
              value={commentUserId}
              options={[{ value: '', label: 'Select user...' }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]}
              onChange={(v) => setCommentUserId(v)}
            />
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
            <Button type="submit" variant="primary" disabled={submittingComment}>{submittingComment ? 'Posting...' : 'Post Comment'}</Button>
          </form>
        </div>
      </div>}

      {confirmRemoveLink && (
        <ConfirmModal
          title="Remove Link"
          message={<>Remove link to <span className="confirm-name">#{confirmRemoveLink.bug_id}</span>?</>}
          confirmLabel="Remove"
          onConfirm={() => { handleRemoveLink(confirmRemoveLink); setConfirmRemoveLink(null); }}
          onCancel={() => setConfirmRemoveLink(null)}
        />
      )}

      {confirmRemoveImage !== null && (
        <ConfirmModal
          title="Remove Image"
          message={<>Remove this image?<br /><span className="confirm-sub">This action cannot be undone.</span></>}
          confirmLabel="Remove"
          onConfirm={() => { setEditImages((prev) => prev.filter((_, j) => j !== confirmRemoveImage)); setConfirmRemoveImage(null); }}
          onCancel={() => setConfirmRemoveImage(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Item"
          message={<>Delete <span className="confirm-name">#{bug.id}</span>?<br /><span className="confirm-sub">This action cannot be undone.</span></>}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
