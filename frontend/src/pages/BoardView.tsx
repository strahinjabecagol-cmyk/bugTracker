import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getBugs, updateBug } from '../api';
import type { Bug } from '../types';
import Badge from '../components/Badge';
import { useProject } from '../context/ProjectContext';

const COLUMNS: { status: Bug['status']; label: string }[] = [
  { status: 'open',        label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'resolved',    label: 'Resolved' },
];

interface DragState {
  bug: Bug;
  offsetX: number;
  offsetY: number;
  width: number;
}

const DRAG_THRESHOLD = 5;

export default function BoardView() {
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Refs for use inside event handlers (always current, no stale closures)
  const dragRef = useRef<DragState | null>(null);
  const overColumnRef = useRef<Bug['status'] | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const pendingRef = useRef<{ bug: Bug; el: HTMLElement } | null>(null);
  const columnRefs = useRef<Map<Bug['status'], HTMLDivElement>>(new Map());

  // State for triggering re-renders
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [overColumn, setOverColumn] = useState<Bug['status'] | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    getBugs({ project_id: selectedProjectId ? Number(selectedProjectId) : undefined })
      .then((all) => setBugs(all.filter((b) => b.status !== 'closed')))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  // Register global mouse listeners once
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const start = startPosRef.current;
      if (!start) return;

      // Activate drag once threshold is crossed
      if (!dragRef.current && pendingRef.current) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          const { bug, el } = pendingRef.current;
          const rect = el.getBoundingClientRect();
          dragRef.current = {
            bug,
            offsetX: start.x - rect.left,
            offsetY: start.y - rect.top,
            width: rect.width,
          };
          setActiveDragId(bug.id);
        }
      }

      if (!dragRef.current) return;

      setMousePos({ x: e.clientX, y: e.clientY });

      // Detect which column the cursor is over
      let found: Bug['status'] | null = null;
      for (const [status, el] of columnRefs.current) {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top  && e.clientY <= rect.bottom) {
          found = status;
          break;
        }
      }
      overColumnRef.current = found;
      setOverColumn(found);
    }

    async function onMouseUp(e: MouseEvent) {
      const drag = dragRef.current;
      const target = overColumnRef.current;
      const start = startPosRef.current;

      // Plain click (no significant movement) → navigate to bug detail
      if (!drag && pendingRef.current && start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.sqrt(dx * dx + dy * dy) <= DRAG_THRESHOLD) {
          navigate(`/bugs/${pendingRef.current.bug.id}`);
        }
      }

      // Drop onto a different column
      if (drag && target && drag.bug.status !== target) {
        const { bug } = drag;
        // Optimistic update
        setBugs((prev) => prev.map((b) => b.id === bug.id ? { ...b, status: target } : b));
        try {
          await updateBug(bug.id, { status: target });
        } catch {
          setBugs((prev) => prev.map((b) => b.id === bug.id ? { ...b, status: bug.status } : b));
        }
      }

      // Reset all drag state
      dragRef.current = null;
      overColumnRef.current = null;
      startPosRef.current = null;
      pendingRef.current = null;
      setActiveDragId(null);
      setOverColumn(null);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [navigate]);

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>, bug: Bug) {
    if (e.button !== 0) return;
    e.preventDefault();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    pendingRef.current = { bug, el: e.currentTarget };
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  const byStatus = (status: Bug['status']) => bugs.filter((b) => b.status === status);

  return (
    <div className="page" style={{ userSelect: activeDragId !== null ? 'none' : undefined }}>
      <div className="page-header">
        <h1>Board</h1>
        <Link to="/bugs/new" className="btn btn-primary">+ New Item</Link>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Loading...</p>
      ) : (
        <div className="board">
          {COLUMNS.map(({ status, label }) => {
            const cards = byStatus(status);
            const isOver = overColumn === status;
            return (
              <div
                key={status}
                ref={(el) => { if (el) columnRefs.current.set(status, el); else columnRefs.current.delete(status); }}
                className={`board-column${isOver ? ' board-column-over' : ''}`}
              >
                <div className="board-column-header">
                  <span className="board-column-title">{label}</span>
                  <span className="board-column-count">{cards.length}</span>
                </div>
                <div className="board-cards">
                  {cards.length === 0 ? (
                    <p className="board-empty">{isOver ? '↓ Drop here' : 'No bugs'}</p>
                  ) : (
                    cards.map((bug) => {
                      const isDragging = activeDragId === bug.id;
                      return (
                        <div
                          key={bug.id}
                          className={`board-card board-card-${bug.type}${isDragging ? ' board-card-dragging' : ''}`}
                          onMouseDown={(e) => handleMouseDown(e, bug)}
                        >
                          <span className="board-card-id">#{bug.id}</span>
                          <p className="board-card-title">{bug.title}</p>
                          <div className="board-card-badges">
                            <Badge value={bug.priority} type="priority" />
                            <Badge value={bug.severity} type="severity" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ghost card — rendered at fixed position, follows cursor */}
      {activeDragId !== null && dragRef.current && (
        <div
          className={`board-card board-card-${dragRef.current.bug.type} board-card-ghost`}
          style={{
            left: Math.round(mousePos.x - dragRef.current.offsetX),
            top: Math.round(mousePos.y - dragRef.current.offsetY),
            width: dragRef.current.width,
          }}
        >
          <span className="board-card-id">#{dragRef.current.bug.id}</span>
          <p className="board-card-title">{dragRef.current.bug.title}</p>
          <div className="board-card-badges">
            <Badge value={dragRef.current.bug.priority} type="priority" />
            <Badge value={dragRef.current.bug.severity} type="severity" />
          </div>
        </div>
      )}
    </div>
  );
}
