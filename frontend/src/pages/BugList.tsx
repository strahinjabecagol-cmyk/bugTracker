import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBugs } from '../api';
import type { Bug } from '../types';
import Badge from '../components/Badge';
import { useProject } from '../context/ProjectContext';

export default function BugList() {
  const { projects, selectedProjectId } = useProject();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getBugs({
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      project_id: selectedProjectId ? Number(selectedProjectId) : undefined,
    })
      .then(setBugs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterStatus, filterPriority, selectedProjectId]);

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? `#${id}`;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Bugs</h1>
        <Link to="/bugs/new" className="btn btn-primary">+ New Bug</Link>
      </div>

      <div className="filters">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Project</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {bugs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No bugs found</td></tr>
            ) : bugs.map((bug) => (
              <tr key={bug.id}>
                <td>#{bug.id}</td>
                <td><Link to={`/bugs/${bug.id}`}>{bug.title}</Link></td>
                <td>{projectName(bug.project_id)}</td>
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
