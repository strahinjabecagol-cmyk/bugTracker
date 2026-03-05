import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import SidebarDropdown from '../components/SidebarDropdown';

const section = (title: string, children: React.ReactNode) => (
  <div style={{ marginBottom: '3rem' }}>
    <h2 style={{ color: '#a5b4fc', fontFamily: 'monospace', fontSize: 'var(--fs-sm)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>{title}</h2>
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

      {/* ── Font scale ── */}
      {section('Font Scale', <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          {([
            ['--fs-2xs', '0.65rem', 'Tiny labels, board IDs'],
            ['--fs-xs',  '0.72rem', 'Chevrons, dates, badge text'],
            ['--fs-sm',  '0.75rem', 'Form labels, secondary text'],
            ['--fs-md',  '0.825rem','Body, table rows, most content'],
            ['--fs-base','0.875rem','Standard text, h4'],
            ['--fs-lg',  '1rem',    'Section text, h3'],
            ['--fs-xl',  '1.15rem', 'h2'],
            ['--fs-2xl', '1.5rem',  'h1, page titles'],
            ['--fs-icon','2rem',    'Decorative icons'],
          ] as const).map(([token, value, usage]) => (
            <div key={token} style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
              <span style={{ fontFamily: 'monospace', color: '#6366f1', fontSize: 'var(--fs-sm)', width: 90, flexShrink: 0 }}>{token}</span>
              <span style={{ color: '#f1f5f9', fontSize: `var(${token})`, lineHeight: 1.2, width: 160, flexShrink: 0 }}>The quick brown fox</span>
              <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: 'var(--fs-sm)', width: 60, flexShrink: 0 }}>{value}</span>
              <span style={{ color: '#64748b', fontSize: 'var(--fs-sm)' }}>{usage}</span>
            </div>
          ))}
        </div>
      </>)}

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
        <span style={{ color: '#64748b', fontSize: 'var(--fs-md)' }}>Selected: <strong style={{ color: '#e2e8f0' }}>{dropdownVal}</strong></span>
      </>)}

      {/* ── ConfirmModal ── */}
      {section('ConfirmModal', <>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>Open Confirm Modal</Button>
        {confirmLastAction && (
          <span style={{ color: '#64748b', fontSize: 'var(--fs-md)' }}>Last action: <strong style={{ color: '#e2e8f0' }}>{confirmLastAction}</strong></span>
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
