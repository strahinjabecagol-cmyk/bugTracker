import { useEffect, useState } from 'react';
import type { Bug, AiUsageLog } from '../types';
import { aiAssess, getAiHistory, updateBug } from '../api';
import Badge from './Badge';
import Button from './Button';

interface AiAssessmentPanelProps {
  bug: Bug;
  onBugUpdated: (updated: Bug) => void;
}

export default function AiAssessmentPanel({ bug, onBugUpdated }: AiAssessmentPanelProps) {
  const [current, setCurrent] = useState<Bug>(bug);
  const [history, setHistory] = useState<AiUsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [applied, setApplied] = useState(
    () => !!bug.ai_suggested_priority &&
      bug.priority === bug.ai_suggested_priority &&
      bug.severity === bug.ai_suggested_severity
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setCurrent(bug);
    setDismissed(false);
    setApplied(
      !!bug.ai_suggested_priority &&
      bug.priority === bug.ai_suggested_priority &&
      bug.severity === bug.ai_suggested_severity
    );
  }, [bug.id]);

  useEffect(() => {
    getAiHistory(bug.id).then(setHistory).catch(() => {});
  }, [bug.id, current.ai_assessed_at]);

  async function handleAssess() {
    setLoading(true);
    setError('');
    setDismissed(false);
    setApplied(false);
    try {
      const updated = await aiAssess(bug.id);
      setCurrent(updated);
      onBugUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!current.ai_suggested_priority || !current.ai_suggested_severity) return;
    setApplying(true);
    setError('');
    try {
      const updated = await updateBug(bug.id, {
        priority: current.ai_suggested_priority,
        severity: current.ai_suggested_severity,
      });
      setCurrent((prev) => ({ ...prev, ...updated }));
      onBugUpdated(updated);
      setApplied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  const hasAssessment = !!current.ai_explanation;
  const showSuggestion = hasAssessment && !dismissed;
  const showActions = showSuggestion && !applied;

  return (
    <div className="detail-card ai-assessment-panel">
      <div className="risk-assessment-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 className="risk-assessment-title">AI Assessment</h2>
          {hasAssessment && (
            <Button variant="ghost" style={{ width: 'fit-content' }} onClick={handleAssess} disabled={loading}>
              {loading ? 'Assessing…' : '↻ Re-assess'}
            </Button>
          )}
        </div>
        {current.ai_assessed_at && (
          <p className="risk-assessment-subtitle">
            Last assessed: {new Date(current.ai_assessed_at).toLocaleString()}
            {current.ai_tokens_in != null && (
              <span style={{ marginLeft: '0.75rem', color: '#64748b' }}>
                {current.ai_tokens_in} ↑ &nbsp;{current.ai_tokens_out} ↓ tokens
              </span>
            )}
          </p>
        )}
      </div>

      {!hasAssessment && (
        <div style={{ padding: '1.5rem 0' }}>
          <Button variant="primary" onClick={handleAssess} disabled={loading}>
            {loading ? 'Running AI Assessment…' : 'Run AI Assessment'}
          </Button>
        </div>
      )}

      {showSuggestion && (
        <div className="ai-assessment-body">
          <p className="ai-explanation">{current.ai_explanation}</p>
          <div className="ai-suggestions">
            <div className="risk-score-row">
              <span className="risk-score-label">Suggested Priority</span>
              <Badge value={current.ai_suggested_priority!} type="priority" />
            </div>
            <div className="risk-score-row">
              <span className="risk-score-label">Suggested Severity</span>
              <Badge value={current.ai_suggested_severity!} type="severity" />
            </div>
          </div>
          {showActions && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="primary" onClick={handleApply} disabled={applying}>
                {applying ? 'Applying…' : 'Apply Suggestions'}
              </Button>
              <Button variant="secondary" onClick={() => setDismissed(true)}>Dismiss</Button>
            </div>
          )}
          {applied && (
            <p style={{ color: '#4ade80', fontSize: '0.875rem', marginTop: '1rem' }}>✓ Suggestions applied.</p>
          )}
        </div>
      )}


      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}

      {history.length > 0 && (
        <div className="ai-history">
          <p className="ai-history-label">Assessment history</p>
          <table className="table ai-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Model</th>
                <th>↑ In</th>
                <th>↓ Out</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.created_at).toLocaleString()}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>{h.model}</td>
                  <td>{h.tokens_in}</td>
                  <td>{h.tokens_out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
