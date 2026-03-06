import { useEffect, useRef, useState } from 'react';
import type { Bug } from '../types';
import { getBugs } from '../api';

export function useProjectBugs(projectId: number | string | null | undefined) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const projectIdRef = useRef(projectId);
  useEffect(() => { projectIdRef.current = projectId; }, [projectId]);

  useEffect(() => {
    setLoading(true);
    const filters: { project_id?: number } = {};
    if (projectId) filters.project_id = Number(projectId);
    getBugs(filters)
      .then(setBugs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as
        | { type: 'bug_created'; bug: Bug }
        | { type: 'bug_updated'; bug: Bug }
        | { type: 'bug_deleted'; id: number };

      const projId = projectIdRef.current;

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

  return { bugs, loading };
}
