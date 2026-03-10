import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAiUsage } from '../api';
import type { AiUsageSummary, AiUsageLog } from '../types';

type SortCol = 'created_at' | 'bug_id' | 'model' | 'tokens_in' | 'tokens_out' | 'total';
type SortDir = 'asc' | 'desc';

export default function AiUsagePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    getAiUsage()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir(col === 'created_at' ? 'desc' : 'asc'); }
  }

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.log].sort((a: AiUsageLog, b: AiUsageLog) => {
      let cmp = 0;
      switch (sortCol) {
        case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break;
        case 'bug_id':     cmp = a.bug_id - b.bug_id; break;
        case 'model':      cmp = a.model.localeCompare(b.model); break;
        case 'tokens_in':  cmp = a.tokens_in - b.tokens_in; break;
        case 'tokens_out': cmp = a.tokens_out - b.tokens_out; break;
        case 'total':      cmp = (a.tokens_in + a.tokens_out) - (b.tokens_in + b.tokens_out); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  function Th({ col, children }: { col: SortCol; children: React.ReactNode }) {
    const active = sortCol === col;
    return (
      <th
        className={`th-sortable${active ? ' th-sorted' : ''}`}
        onClick={() => handleSort(col)}
      >
        {children}
        <span className={`sort-icon${active ? '' : ' sort-icon-inactive'}`}>
          {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
        </span>
      </th>
    );
  }

  return (
    <div className="page ai-usage-page">
      <div className="page-header">
        <h1 className="board-heading"><span>AI Token Usage</span></h1>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Loading...</p>
      ) : data && (
        <>
          <div className="ai-usage-summary">
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Total Calls</span>
              <span className="ai-usage-stat-value">{data.total_calls}</span>
            </div>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Tokens In</span>
              <span className="ai-usage-stat-value">{data.total_tokens_in.toLocaleString()}</span>
            </div>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Tokens Out</span>
              <span className="ai-usage-stat-value">{data.total_tokens_out.toLocaleString()}</span>
            </div>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Total Tokens</span>
              <span className="ai-usage-stat-value">{(data.total_tokens_in + data.total_tokens_out).toLocaleString()}</span>
            </div>
          </div>

          <div className="ai-usage-summary" style={{ marginTop: '1rem' }}>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Avg In / Call</span>
              <span className="ai-usage-stat-value">{data.total_calls ? Math.round(data.total_tokens_in / data.total_calls).toLocaleString() : 0}</span>
            </div>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Avg Out / Call</span>
              <span className="ai-usage-stat-value">{data.total_calls ? Math.round(data.total_tokens_out / data.total_calls).toLocaleString() : 0}</span>
            </div>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Avg Total / Call</span>
              <span className="ai-usage-stat-value">{data.total_calls ? Math.round((data.total_tokens_in + data.total_tokens_out) / data.total_calls).toLocaleString() : 0}</span>
            </div>
          </div>

          <table className="table" style={{ marginTop: '1.5rem' }}>
            <thead>
              <tr>
                <Th col="created_at">Date</Th>
                <Th col="bug_id">Item</Th>
                <Th col="model">Model</Th>
                <Th col="tokens_in">In</Th>
                <Th col="tokens_out">Out</Th>
                <Th col="total">Total</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>No assessments yet</td></tr>
              ) : sorted.map((row) => (
                <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bugs/${row.bug_id}`)}>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>
                    <span style={{ color: '#64748b', marginRight: '0.4rem' }}>#{row.bug_id}</span>
                    {row.bug_title}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>{row.model}</td>
                  <td>{row.tokens_in}</td>
                  <td>{row.tokens_out}</td>
                  <td style={{ fontWeight: 600 }}>{row.tokens_in + row.tokens_out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
