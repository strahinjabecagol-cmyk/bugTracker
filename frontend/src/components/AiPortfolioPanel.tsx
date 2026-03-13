import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AiPortfolioAssessment, AiPortfolioResult } from '../types';
import { getLatestPortfolioAssess, runPortfolioAssess, applyPortfolioAssess, updateBug } from '../api';
import Badge from './Badge';
import Button from './Button';
import { calcCostDollars, formatCost } from '../utils/cost';

interface AiPortfolioPanelProps {
  readOnly?: boolean;
  projectId?: number | null;
}

function suggestionsMatchCurrent(r: AiPortfolioResult): boolean {
  return r.suggested_priority === r.current_priority && r.suggested_severity === r.current_severity;
}

export default function AiPortfolioPanel({ readOnly = false, projectId }: AiPortfolioPanelProps) {
  const [data, setData] = useState<AiPortfolioAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState<'all' | number | null>(null);
  const [error, setError] = useState('');
  const [appliedInSession, setAppliedInSession] = useState<Set<number>>(new Set());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    initialLoadDone.current = false;
    getLatestPortfolioAssess(projectId)
      .then((result) => {
        setData(result);
        // Pre-populate applied state for existing run so rows that already match show as applied
        if (!initialLoadDone.current && result?.results) {
          initialLoadDone.current = true;
          setAppliedInSession(new Set(
            result.results.filter(suggestionsMatchCurrent).map((r) => r.bug_id)
          ));
        }
      })
      .catch(() => setError('Failed to load portfolio assessment.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleRun() {
    setRunning(true);
    setError('');
    try {
      const result = await runPortfolioAssess(projectId);
      setData(result);
      setAppliedInSession(new Set()); // fresh run — nothing applied yet in this session
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleApplyAll() {
    setApplying('all');
    setError('');
    try {
      await applyPortfolioAssess();
      setData((prev) => prev ? {
        ...prev,
        results: prev.results.map((r) => ({
          ...r,
          current_priority: r.suggested_priority,
          current_severity: r.suggested_severity,
        })),
      } : prev);
      setAppliedInSession((prev) => {
        const next = new Set(prev);
        data?.results.forEach((r) => next.add(r.bug_id));
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setApplying(null);
    }
  }

  async function handleApplyOne(r: AiPortfolioResult) {
    setApplying(r.bug_id);
    setError('');
    try {
      await updateBug(r.bug_id, {
        priority: r.suggested_priority,
        severity: r.suggested_severity,
      });
      setData((prev) => prev ? {
        ...prev,
        results: prev.results.map((res) =>
          res.bug_id === r.bug_id
            ? { ...res, current_priority: r.suggested_priority, current_severity: r.suggested_severity }
            : res
        ),
      } : prev);
      setAppliedInSession((prev) => new Set([...prev, r.bug_id]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setApplying(null);
    }
  }

  const hasResults = !!data?.run && data.results.length > 0;
  const anyUnapplied = hasResults && data!.results.some((r) => !appliedInSession.has(r.bug_id));

  return (
    <div className="detail-card ai-assessment-panel ai-portfolio-panel">
      <div className="risk-assessment-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 className="risk-assessment-title">AI Portfolio Assessment</h2>
          {hasResults && !readOnly && (
            <>
              <Button variant="ghost" style={{ width: 'fit-content' }} onClick={handleRun} disabled={running || applying !== null}>
                {running ? 'Running…' : '↻ Re-run'}
              </Button>
              {anyUnapplied && (
                <Button variant="primary" style={{ width: 'fit-content' }} onClick={handleApplyAll} disabled={applying !== null}>
                  {applying === 'all' ? 'Applying…' : '✓ Apply All'}
                </Button>
              )}
            </>
          )}
        </div>
        {data?.run && (
          <p className="risk-assessment-subtitle">
            Last run: {new Date(data.run.run_at).toLocaleString()}
            <span style={{ marginLeft: '0.75rem', color: '#64748b' }}>
              {data.run.tokens_in} ↑ &nbsp;{data.run.tokens_out} ↓ tokens · {data.run.item_count} items
            </span>
            <span style={{ marginLeft: '0.75rem', color: '#4ade80', fontWeight: 600 }}>
              {formatCost(calcCostDollars(data.run.tokens_in, data.run.tokens_out))}
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
                <th>Suggested Priority</th>
                <th>Suggested Severity</th>
                <th>Rationale</th>
                {!readOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {data!.results.map((r) => {
                const applied = appliedInSession.has(r.bug_id);
                return (
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
                    {!readOnly && (
                      <td>
                        {applied ? (
                          <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>✓ Changes applied</span>
                        ) : (
                          <Button
                            variant="ghost"
                            style={{ width: 'fit-content', fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                            onClick={() => handleApplyOne(r)}
                            disabled={applying !== null}
                          >
                            {applying === r.bug_id ? '…' : 'Apply'}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}
