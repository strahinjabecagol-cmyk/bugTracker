import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import SidebarDropdown from '../components/SidebarDropdown';

const section = (title: string, children: React.ReactNode) => (
  <div style={{ marginBottom: '3rem' }}>
    <h2 style={{ color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>{title}</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
      {children}
    </div>
  </div>
);

export default function ComponentPlayground() {
  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLastAction, setConfirmLastAction] = useState('');
  const [dropdownVal, setDropdownVal] = useState<string>('medium');

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="board-heading">Component Playground</h1>
      </div>

      {/* ── Buttons ── */}
      {section('Button — variants', <>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" disabled>Disabled</Button>
      </>)}

      {/* ── Badges — status ── */}
      {section('Badge — status',
        <div className="badge-showcase" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {(['open', 'in_progress', 'resolved', 'closed'] as const).map((v) => (
            <Badge key={v} value={v} type="status" />
          ))}
        </div>
      )}

      {/* ── Badges — priority ── */}
      {section('Badge — priority',
        <div className="badge-showcase" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {(['low', 'medium', 'high', 'critical'] as const).map((v) => (
            <Badge key={v} value={v} type="priority" />
          ))}
        </div>
      )}

      {/* ── Badges — severity ── */}
      {section('Badge — severity',
        <div className="badge-showcase" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {(['minor', 'major', 'critical', 'blocker'] as const).map((v) => (
            <Badge key={v} value={v} type="severity" />
          ))}
        </div>
      )}

      {/* ── Badges — type ── */}
      {section('Badge — type',
        <div className="badge-showcase" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {(['bug', 'task'] as const).map((v) => (
            <Badge key={v} value={v} type="type" />
          ))}
        </div>
      )}

      {/* ── Dropdown ── */}
      {section('SidebarDropdown', <>
        <div style={{ minWidth: 180 }}>
          <SidebarDropdown
            label="Priority"
            value={dropdownVal}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
            badgeType="priority"
            onChange={setDropdownVal}
          />
        </div>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Selected: <strong style={{ color: '#e2e8f0' }}>{dropdownVal}</strong></span>
      </>)}

      {/* ── ConfirmModal ── */}
      {section('ConfirmModal', <>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>Open Confirm Modal</Button>
        {confirmLastAction && (
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Last action: <strong style={{ color: '#e2e8f0' }}>{confirmLastAction}</strong></span>
        )}
      </>)}

      {confirmOpen && (
        <ConfirmModal
          title="Delete Item"
          message={<>Delete <span className="confirm-name">#42</span>?<br /><span className="confirm-sub">This action cannot be undone.</span></>}
          confirmLabel="Delete"
          onConfirm={() => { setConfirmLastAction('confirmed'); setConfirmOpen(false); }}
          onCancel={() => { setConfirmLastAction('cancelled'); setConfirmOpen(false); }}
        />
      )}
    </div>
  );
}
