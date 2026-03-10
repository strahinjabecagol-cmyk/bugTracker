import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAiUsage } from '../api';
import type { AiUsageSummary } from '../types';

export default function AiUsagePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="page">
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
              <span className="ai-usage-stat-label">↑ Tokens In</span>
              <span className="ai-usage-stat-value">{data.total_tokens_in.toLocaleString()}</span>
            </div>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">↓ Tokens Out</span>
              <span className="ai-usage-stat-value">{data.total_tokens_out.toLocaleString()}</span>
            </div>
            <div className="ai-usage-stat">
              <span className="ai-usage-stat-label">Total Tokens</span>
              <span className="ai-usage-stat-value">{(data.total_tokens_in + data.total_tokens_out).toLocaleString()}</span>
            </div>
          </div>

          <table className="table" style={{ marginTop: '1.5rem' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Model</th>
                <th>↑ In</th>
                <th>↓ Out</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.log.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>No assessments yet</td></tr>
              ) : data.log.map((row) => (
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
