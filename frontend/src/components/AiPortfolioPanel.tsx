import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AiPortfolioAssessment } from '../types';
import { getLatestPortfolioAssess, runPortfolioAssess } from '../api';
import Badge from './Badge';
import Button from './Button';

interface AiPortfolioPanelProps {
  readOnly?: boolean;
}

export default function AiPortfolioPanel({ readOnly = false }: AiPortfolioPanelProps) {
  const [data, setData] = useState<AiPortfolioAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getLatestPortfolioAssess()
      .then(setData)
      .catch(() => setError('Failed to load portfolio assessment.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRun() {
    setRunning(true);
    setError('');
    try {
      const result = await runPortfolioAssess();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment failed');
    } finally {
      setRunning(false);
    }
  }

  const hasResults = !!data?.run && data.results.length > 0;

  return (
    <div className="detail-card ai-assessment-panel ai-portfolio-panel">
      <div className="risk-assessment-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 className="risk-assessment-title">AI Portfolio Assessment</h2>
          {hasResults && !readOnly && (
            <Button variant="ghost" style={{ width: 'fit-content' }} onClick={handleRun} disabled={running}>
              {running ? 'Running…' : '↻ Re-run'}
            </Button>
          )}
        </div>
        {data?.run && (
          <p className="risk-assessment-subtitle">
            Last run: {new Date(data.run.run_at).toLocaleString()}
            <span style={{ marginLeft: '0.75rem', color: '#64748b' }}>
              {data.run.tokens_in} ↑ &nbsp;{data.run.tokens_out} ↓ tokens · {data.run.item_count} items
            </span>
          </p>
        )}
      </div>

      {loading && (
        <p style={{ color: '#94a3b8', padding: '1.5rem 0', fontSize: '0.875rem' }}>Loading…</p>
      )}

      {!loading && !hasResults && !readOnly && (
        <div style={{ padding: '1.5rem 0' }}>
          <Button variant="primary" onClick={handleRun} disabled={running}>
            {running ? 'Running AI Portfolio Assessment…' : 'Run Portfolio Assessment'}
          </Button>
        </div>
      )}

      {!loading && !hasResults && readOnly && (
        <p style={{ color: '#64748b', padding: '1.5rem 0', fontSize: '0.875rem' }}>No assessment yet.</p>
      )}

      {hasResults && (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="table ai-portfolio-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Item</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Severity</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {data!.results.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: '#e2e8f0' }}>#{r.rank}</td>
                  <td>
                    <Link to={`/bugs/${r.bug_id}`} style={{ color: '#818cf8' }}>
                      #{r.bug_id} {r.bug_title}
                    </Link>
                  </td>
                  <td><Badge value={r.bug_status} type="status" /></td>
                  <td><Badge value={r.suggested_priority} type="priority" /></td>
                  <td><Badge value={r.suggested_severity} type="severity" /></td>
                  <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{r.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}
