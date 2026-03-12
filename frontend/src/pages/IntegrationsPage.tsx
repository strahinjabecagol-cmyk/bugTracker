import { useEffect, useState } from 'react';
import { getIntegrations, createIntegration, updateIntegration, deleteIntegration } from '../api';
import type { IntegrationProfile } from '../types';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import SidebarDropdown from '../components/SidebarDropdown';

type Platform = 'github' | 'gitlab' | 'bitbucket';

const PLATFORM_OPTIONS = [
  { value: 'github',    label: 'GitHub' },
  { value: 'gitlab',    label: 'GitLab' },
  { value: 'bitbucket', label: 'Bitbucket' },
];

interface FormState {
  name:     string;
  platform: Platform;
  base_url: string;
  repo:     string;
  token:    string;
}

const EMPTY_FORM: FormState = { name: '', platform: 'github', base_url: '', repo: '', token: '' };

export default function IntegrationsPage() {
  const [profiles, setProfiles]             = useState<IntegrationProfile[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [formOpen, setFormOpen]             = useState(false);
  const [editing, setEditing]               = useState<IntegrationProfile | null>(null);
  const [form, setForm]                     = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError]           = useState('');
  const [saving, setSaving]                 = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<IntegrationProfile | null>(null);
  const [deleteError, setDeleteError]       = useState('');
  const [deleteProjects, setDeleteProjects] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    getIntegrations()
      .then(setProfiles)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(p: IntegrationProfile) {
    setEditing(p);
    setForm({ name: p.name, platform: p.platform, base_url: p.base_url, repo: p.repo, token: '' });
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    if (!form.name.trim())  { setFormError('Name is required.'); return; }
    if (!form.repo.trim())  { setFormError('Repo is required.'); return; }
    if (form.platform === 'gitlab' && !form.base_url.trim()) { setFormError('Base URL is required for GitLab.'); return; }
    if (!editing && !form.token.trim()) { setFormError('Access token is required.'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await updateIntegration(editing.id, {
          name:     form.name,
          platform: form.platform,
          base_url: form.base_url,
          repo:     form.repo,
          ...(form.token ? { access_token: form.token } : {}),
        });
        setProfiles((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      } else {
        const created = await createIntegration({
          name:         form.name,
          platform:     form.platform,
          base_url:     form.base_url,
          repo:         form.repo,
          access_token: form.token,
        });
        setProfiles((prev) => [...prev, created]);
      }
      closeForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteIntegration(deleteTarget.id);
    if (result.ok) {
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteError('');
      setDeleteProjects([]);
    } else {
      setDeleteError(result.error);
      setDeleteProjects(result.projects ?? []);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="page integrations-page">
      <div className="page-header">
        <h1 className="board-heading">Integrations</h1>
        <div className="header-actions">
          <Button variant="primary" onClick={openAdd}>+ Add Integration</Button>
        </div>
      </div>

      {loading && <p style={{ color: '#94a3b8' }}>Loading...</p>}
      {error   && <p className="error">{error}</p>}

      {deleteError && (
        <div className="error" style={{ marginBottom: '1rem' }}>
          {deleteError}
          {deleteProjects.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0 1rem' }}>
              {deleteProjects.map((p) => <li key={p.id}>{p.name}</li>)}
            </ul>
          )}
          <Button variant="ghost" style={{ marginTop: '0.5rem' }} onClick={() => { setDeleteError(''); setDeleteProjects([]); }}>Dismiss</Button>
        </div>
      )}

      {!loading && !error && (
        <div className="detail-card" style={{ marginTop: '1rem' }}>
          {profiles.length === 0 ? (
            <p style={{ color: '#94a3b8', padding: '1rem' }}>No integration profiles configured yet.</p>
          ) : (
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Platform</th>
                  <th>Base URL</th>
                  <th>Repo</th>
                  <th>Token</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><Badge value={p.platform} type="platform" /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.base_url || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.repo}</td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>••••••••</td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="danger" onClick={() => { setDeleteTarget(p); setDeleteError(''); setDeleteProjects([]); }}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add / Edit form */}
      {formOpen && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1.25rem' }}>{editing ? 'Edit Integration' : 'Add Integration'}</h3>

            <div className="form-group">
              <label>Display Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Company GitLab" />
            </div>

            <SidebarDropdown
              label="Platform"
              value={form.platform}
              options={PLATFORM_OPTIONS}
              onChange={(v) => setForm((f) => ({ ...f, platform: v as Platform, base_url: '' }))}
            />

            {form.platform === 'gitlab' && (
              <div className="form-group">
                <label>Base URL *</label>
                <input type="text" value={form.base_url} onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))} placeholder="https://gitlab.yourcompany.com" />
              </div>
            )}

            <div className="form-group">
              <label>Repo *</label>
              <input
                type="text"
                value={form.repo}
                onChange={(e) => setForm((f) => ({ ...f, repo: e.target.value }))}
                placeholder={form.platform === 'gitlab' ? 'namespace/project or numeric ID' : 'owner/repo-slug'}
              />
            </div>

            <div className="form-group">
              <label>Access Token {editing ? '(leave blank to keep current)' : '*'}</label>
              <input type="password" value={form.token} onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))} placeholder="••••••••" autoComplete="new-password" />
            </div>

            {formError && <p className="error" style={{ marginBottom: '0.75rem' }}>{formError}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={closeForm}>Cancel</Button>
              <Button variant="primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Integration"
          message={<>Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.<br /><span className="confirm-sub">Any projects bound to this profile will lose their integration.</span></>}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
