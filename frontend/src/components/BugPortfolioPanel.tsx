import { useEffect, useState } from 'react';
import type { BugPortfolioAssessment } from '../types';
import type { Bug } from '../types';
import { getBugPortfolioAssessment, updateBug } from '../api';
import Badge from './Badge';
import Button from './Button';

interface BugPortfolioPanelProps {
  bug: Bug;
  readOnly?: boolean;
  onBugUpdated: (updated: Bug) => void;
}

export default function BugPortfolioPanel({ bug, readOnly = false, onBugUpdated }: BugPortfolioPanelProps) {
  const [data, setData] = useState<BugPortfolioAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getBugPortfolioAssessment(bug.id)
      .then(setData)
      .catch(() => setError('Failed to load portfolio assessment.'))
      .finally(() => setLoading(false));
  }, [bug.id]);

  const isApplied = !!data &&
    data.suggested_priority === data.current_priority &&
    data.suggested_severity === data.current_severity;

  async function handleApply() {
    if (!data) return;
    setApplying(true);
    setError('');
    try {
      const updated = await updateBug(bug.id, {
        priority: data.suggested_priority,
        severity: data.suggested_severity,
      });
      onBugUpdated(updated);
      setData((prev) => prev ? {
        ...prev,
        current_priority: data.suggested_priority,
        current_severity: data.suggested_severity,
      } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="detail-card ai-assessment-panel">
      <div className="risk-assessment-header">
        <h2 className="risk-assessment-title">Portfolio AI Assessment</h2>
        <p className="risk-assessment-subtitle">
          Rank <strong style={{ color: '#e2e8f0' }}>#{data.rank}</strong> of {data.item_count} &nbsp;·&nbsp; {new Date(data.run_at).toLocaleString()}
          <span style={{ marginLeft: '0.75rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8rem' }}>{data.model}</span>
        </p>
      </div>

      <div className="ai-assessment-body">
        <p className="ai-explanation">{data.rationale}</p>
        <div className="ai-suggestions">
          <div className="risk-score-row">
            <span className="risk-score-label">Suggested Priority</span>
            <Badge value={data.suggested_priority} type="priority" />
          </div>
          <div className="risk-score-row">
            <span className="risk-score-label">Suggested Severity</span>
            <Badge value={data.suggested_severity} type="severity" />
          </div>
        </div>

        {isApplied ? (
          <p style={{ color: '#4ade80', fontSize: '0.875rem', marginTop: '1rem' }}>✓ Suggestions applied.</p>
        ) : !readOnly ? (
          <div style={{ marginTop: '1rem' }}>
            <Button variant="primary" style={{ width: 'fit-content' }} onClick={handleApply} disabled={applying}>
              {applying ? 'Applying…' : 'Apply Suggestions'}
            </Button>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '1rem' }}>Not yet applied.</p>
        )}
      </div>

      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}
