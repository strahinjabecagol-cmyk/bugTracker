import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bug } from '../types';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import RiskMatrix from '../components/RiskMatrix';
import MultiDropdown from '../components/MultiDropdown';
import AiPortfolioPanel from '../components/AiPortfolioPanel';
import { useMultiFilter } from '../hooks/useMultiFilter';
import { useProjectBugs } from '../hooks/useProjectBugs';
import { PRIORITY_SCORE, SEVERITY_SCORE, quadrantLabel } from '../utils/risk';

type SortCol = 'id' | 'title' | 'type' | 'priority' | 'severity' | 'status' | 'quadrant';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
const SEVERITY_ORDER = { minor: 0, major: 1, critical: 2, blocker: 3 };
const STATUS_ORDER   = { open: 0, in_progress: 1, resolved: 2, closed: 3 };

export default function RiskAssessmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { selectedProjectId } = useProject();
  const { bugs, loading } = useProjectBugs(selectedProjectId);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>('quadrant');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const typeFilter   = useMultiFilter<Bug['type']>();
  const statusFilter = useMultiFilter<'open' | 'in_progress' | 'resolved'>(['open', 'in_progress']);

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  const visible = bugs.filter((b) => {
    if (b.status === 'closed') return false;
    if (typeFilter.selected.size > 0 && !typeFilter.selected.has(b.type)) return false;
    if (statusFilter.selected.size > 0 && !statusFilter.selected.has(b.status as 'open' | 'in_progress' | 'resolved')) return false;
    return true;
  });

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir(col === 'quadrant' ? 'desc' : 'asc'); }
  }

  const sorted = useMemo(() => [...visible].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 'id':       cmp = a.id - b.id; break;
      case 'title':    cmp = a.title.localeCompare(b.title); break;
      case 'type':     cmp = a.type.localeCompare(b.type); break;
      case 'priority': cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
      case 'severity': cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]; break;
      case 'status':   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case 'quadrant': cmp = (PRIORITY_SCORE[a.priority] + SEVERITY_SCORE[a.severity]) - (PRIORITY_SCORE[b.priority] + SEVERITY_SCORE[b.severity]); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  }), [visible, sortCol, sortDir]);

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
    <div className="page risk-page">
      <div className="page-header risk-page-header">
        <div>
          <h1 className="board-heading">Risk Assessment</h1>
          <p className="risk-page-subtitle">
            Items plotted by severity (impact) and priority (urgency)
            {selectedProjectId ? '' : ' across all projects'}.
          </p>
        </div>
        <div className="risk-filters">
          <MultiDropdown hook={typeFilter}   items={['bug', 'task']}                          singular="type"   plural="types"    badgeType="type"   />
          <MultiDropdown hook={statusFilter} items={['open', 'in_progress', 'resolved']}      singular="status" plural="statuses" badgeType="status" />
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', padding: '2rem 0' }}>Loading...</p>
      ) : (
        <>
          <RiskMatrix
            items={visible}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onClickItem={(id) => navigate(`/bugs/${id}`)}
            emptyMessage="No items match the current filters."
          />

          <div className="risk-table-section">
            <h3 className="risk-table-heading">Items by Risk ({visible.length})</h3>
            <div className="risk-table-wrap">
              <table className="table risk-table">
                <thead>
                  <tr>
                    <Th col="id">#</Th>
                    <Th col="title">Title</Th>
                    <Th col="type">Type</Th>
                    <Th col="priority">Priority</Th>
                    <Th col="severity">Severity</Th>
                    <Th col="status">Status</Th>
                    <Th col="quadrant">Quadrant</Th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((bug) => {
                    const ql = quadrantLabel(bug);
                    return (
                      <tr
                        key={bug.id}
                        className={hoveredId === bug.id ? 'risk-row--hovered' : ''}
                        onMouseEnter={() => setHoveredId(bug.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => navigate(`/bugs/${bug.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>#{bug.id}</td>
                        <td className="risk-table-title">{bug.title}</td>
                        <td><Badge value={bug.type} type="type" /></td>
                        <td><Badge value={bug.priority} type="priority" /></td>
                        <td><Badge value={bug.severity} type="severity" /></td>
                        <td><Badge value={bug.status} type="status" /></td>
                        <td><Badge value={ql} type="quadrant" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <AiPortfolioPanel readOnly={!isAdmin} projectId={selectedProjectId} />
        </>
      )}
    </div>
  );
}
