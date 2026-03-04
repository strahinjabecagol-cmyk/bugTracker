import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { getBugs } from '../api';
import type { Bug } from '../types';
import Badge from '../components/Badge';
import { useProject } from '../context/ProjectContext';

type SortCol = 'id' | 'title' | 'project' | 'type' | 'status' | 'priority' | 'severity';
type SortDir = 'asc' | 'desc';
type Priority = Bug['priority'];
type Severity = Bug['severity'];
type Status   = Bug['status'];
type BugType  = Bug['type'];

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];
const SEVERITIES: Severity[] = ['minor', 'major', 'critical', 'blocker'];
const STATUSES:   Status[]   = ['open', 'in_progress', 'resolved', 'closed'];
const TYPES:      BugType[]  = ['bug', 'task'];
const PRIORITY_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
const SEVERITY_ORDER = { minor: 0, major: 1, critical: 2, blocker: 3 };
const STATUS_ORDER   = { open: 0, in_progress: 1, resolved: 2, closed: 3 };

function useMultiFilter<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(v: T) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  function clear() { setSelected(new Set()); }

  function label(singular: string) {
    if (selected.size === 0) return `All ${singular}s`;
    if (selected.size === 1) return [...selected][0];
    return `${selected.size} ${singular}s`;
  }

  return { selected, open, setOpen, ref, toggle, clear, label };
}

type FilterHook<T extends string> = ReturnType<typeof useMultiFilter<T>>;

function MultiDropdown<T extends string>({ hook, items, singular, badgeType }: {
  hook: FilterHook<T>;
  items: T[];
  singular: string;
  badgeType: 'priority' | 'severity' | 'status' | 'type';
}) {
  return (
    <div className="priority-dropdown" ref={hook.ref}>
      <button
        className={`priority-dropdown-trigger${hook.open ? ' open' : ''}${hook.selected.size > 0 ? ' has-selection' : ''}`}
        onClick={() => hook.setOpen((o) => !o)}
      >
        <span>{hook.label(singular)}</span>
        {hook.selected.size > 0
          ? <span className="dropdown-clear" onClick={(e) => { e.stopPropagation(); hook.clear(); }}>×</span>
          : <span className="dropdown-chevron">▾</span>
        }
      </button>
      {hook.open && (
        <div className="priority-dropdown-menu">
          {items.map((v) => (
            <div
              key={v}
              className={`priority-dropdown-item${hook.selected.has(v) ? ' active' : ''}`}
              onClick={() => hook.toggle(v)}
            >
              <span className={`badge badge-${badgeType}-${v.replace('_', '-')}`}>
                <span>{v.replace('_', ' ')}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BugList() {
  const { projects, selectedProjectId } = useProject();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const selectedProjectIdRef = useRef(selectedProjectId);
  useEffect(() => { selectedProjectIdRef.current = selectedProjectId; }, [selectedProjectId]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as
        | { type: 'bug_created'; bug: Bug }
        | { type: 'bug_updated'; bug: Bug }
        | { type: 'bug_deleted'; id: number };

      const projId = selectedProjectIdRef.current;

      if (msg.type === 'bug_created') {
        const { bug } = msg;
        if (projId && bug.project_id !== Number(projId)) return;
        setBugs((prev) => prev.find((b) => b.id === bug.id) ? prev : [...prev, bug]);
      } else if (msg.type === 'bug_updated') {
        const { bug } = msg;
        setBugs((prev) => {
          if (projId && bug.project_id !== Number(projId)) return prev.filter((b) => b.id !== bug.id);
          const exists = prev.find((b) => b.id === bug.id);
          return exists ? prev.map((b) => b.id === bug.id ? bug : b) : [...prev, bug];
        });
      } else if (msg.type === 'bug_deleted') {
        setBugs((prev) => prev.filter((b) => b.id !== msg.id));
      }
    };

    ws.onerror = (err) => console.error('WS error:', err);
    return () => ws.close();
  }, []);

  const priority = useMultiFilter<Priority>();
  const severity = useMultiFilter<Severity>();
  const status   = useMultiFilter<Status>();
  const bugType  = useMultiFilter<BugType>();

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getBugs({ project_id: selectedProjectId ? Number(selectedProjectId) : undefined })
      .then(setBugs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  const sorted = useMemo(() => {
    const pName = (id: number) => projects.find((p) => p.id === id)?.name ?? `${id}`;
    const filtered = bugs
      .filter((b) => status.selected.size   === 0 || status.selected.has(b.status))
      .filter((b) => priority.selected.size === 0 || priority.selected.has(b.priority))
      .filter((b) => severity.selected.size === 0 || severity.selected.has(b.severity))
      .filter((b) => bugType.selected.size  === 0 || bugType.selected.has(b.type));

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'id':       cmp = a.id - b.id; break;
        case 'title':    cmp = a.title.localeCompare(b.title); break;
        case 'project':  cmp = pName(a.project_id).localeCompare(pName(b.project_id)); break;
        case 'type':     cmp = a.type.localeCompare(b.type); break;
        case 'status':   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
        case 'priority': cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
        case 'severity': cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [bugs, status.selected, priority.selected, severity.selected, bugType.selected, sortCol, sortDir, projects]);

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? `#${id}`;

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="sort-icon sort-icon-inactive">↕</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function Th({ col, children }: { col: SortCol; children: React.ReactNode }) {
    return (
      <th className={`th-sortable${sortCol === col ? ' th-sorted' : ''}`} onClick={() => handleSort(col)}>
        {children} <SortIcon col={col} />
      </th>
    );
  }

  return (
    <div className="page items-page">
      <div className="page-header">
        <h1 className="board-heading">
          <span>
            {selectedProjectId
              ? `${projects.find((p) => String(p.id) === selectedProjectId)?.name ?? ''} Items`
              : 'Items'}
          </span>
        </h1>
        <Link to="/bugs/new"><Button variant="primary">+ New Item</Button></Link>
      </div>

      <div className="filters">
        <MultiDropdown hook={bugType}  items={TYPES}      singular="type"     badgeType="type"     />
        <MultiDropdown hook={status}   items={STATUSES}   singular="status"   badgeType="status"   />
        <MultiDropdown hook={priority} items={PRIORITIES} singular="priority" badgeType="priority" />
        <MultiDropdown hook={severity} items={SEVERITIES} singular="severity" badgeType="severity" />
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <Th col="id">ID</Th>
              <Th col="title">Title</Th>
              <Th col="project">Project</Th>
              <Th col="type">Type</Th>
              <Th col="status">Status</Th>
              <Th col="priority">Priority</Th>
              <Th col="severity">Severity</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>No bugs found</td></tr>
            ) : sorted.map((bug) => (
              <tr key={bug.id}>
                <td>#{bug.id}</td>
                <td><Link to={`/bugs/${bug.id}`}>{bug.title}</Link></td>
                <td><span className="project-pill"><span>{projectName(bug.project_id)}</span></span></td>
                <td><Badge value={bug.type} type="type" /></td>
                <td><Badge value={bug.status} type="status" /></td>
                <td><Badge value={bug.priority} type="priority" /></td>
                <td><Badge value={bug.severity} type="severity" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
