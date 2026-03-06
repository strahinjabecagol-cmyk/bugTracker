import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBugs } from '../api';
import type { Bug } from '../types';
import { useProject } from '../context/ProjectContext';
import Badge from '../components/Badge';
import RiskMatrix from '../components/RiskMatrix';
import SidebarDropdown from '../components/SidebarDropdown';
import { PRIORITY_SCORE, SEVERITY_SCORE, quadrantLabel } from '../utils/risk';

export default function RiskAssessmentPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProject();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    const filters: { project_id?: number } = {};
    if (selectedProjectId) filters.project_id = Number(selectedProjectId);
    getBugs(filters)
      .then(setBugs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const visible = bugs.filter((b) => {
    if (b.status === 'closed') return false;
    if (typeFilter !== 'all' && b.type !== typeFilter) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  const sorted = [...visible].sort((a, b) =>
    (PRIORITY_SCORE[b.priority] + SEVERITY_SCORE[b.severity]) -
    (PRIORITY_SCORE[a.priority] + SEVERITY_SCORE[a.severity])
  );

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
          <SidebarDropdown
            label="Type"
            value={typeFilter}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'bug', label: 'Bug' },
              { value: 'task', label: 'Task' },
            ]}
            onChange={setTypeFilter}
            className="risk-filter-dropdown"
          />
          <SidebarDropdown
            label="Status"
            value={statusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            onChange={setStatusFilter}
            className="risk-filter-dropdown"
          />
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
                    <th>#</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Quadrant</th>
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
        </>
      )}
    </div>
  );
}
