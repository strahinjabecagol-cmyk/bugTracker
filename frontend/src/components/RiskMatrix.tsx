import type { Bug } from '../types';
import Badge from './Badge';
import { riskColor, dotPosition } from '../utils/risk';

interface RiskMatrixProps {
  items: Bug[];
  highlightId?: number | null;   // always-visible highlight (current item in panel view)
  hoveredId?: number | null;     // externally controlled hover (for table sync)
  onHover?: (id: number | null) => void;
  onClickItem?: (id: number) => void;
  emptyMessage?: string;
}

export default function RiskMatrix({
  items,
  highlightId,
  hoveredId,
  onHover,
  onClickItem,
  emptyMessage = 'No items to display.',
}: RiskMatrixProps) {
  return (
    <div className="risk-matrix-wrap">
      <div className="risk-yaxis">
        <span>High Urgency</span>
        <span className="risk-axis-line">↑ Priority</span>
        <span>Low Urgency</span>
      </div>

      <div className="risk-matrix-col">
        <div className="risk-matrix-container">
          <div className="risk-qlabel risk-qlabel--tl">
            <span className="risk-qlabel-name risk-qlabel-name--monitor">Monitor</span>
            <span className="risk-qlabel-desc">Low Impact · High Urgency</span>
          </div>
          <div className="risk-qlabel risk-qlabel--tr">
            <span className="risk-qlabel-name risk-qlabel-name--critical">Critical</span>
            <span className="risk-qlabel-desc">High Impact · High Urgency</span>
          </div>
          <div className="risk-qlabel risk-qlabel--bl">
            <span className="risk-qlabel-name risk-qlabel-name--lowrisk">Low Risk</span>
            <span className="risk-qlabel-desc">Low Impact · Low Urgency</span>
          </div>
          <div className="risk-qlabel risk-qlabel--br">
            <span className="risk-qlabel-name risk-qlabel-name--plan">Plan</span>
            <span className="risk-qlabel-desc">High Impact · Low Urgency</span>
          </div>

          <div className="risk-ch-v" />
          <div className="risk-ch-h" />

          {items.map((bug) => {
            const pos = dotPosition(bug);
            const color = riskColor(bug);
            const isHighlighted = bug.id === highlightId;
            const isHovered = bug.id === hoveredId;

            let className = 'risk-dot';
            if (isHighlighted) className += ' risk-dot--highlight';
            if (isHovered) className += ' risk-dot--hovered';

            let boxShadow: string;
            if (isHighlighted && isHovered) {
              boxShadow = `0 0 0 2px #1e293b, 0 0 0 4px ${color}, 0 0 16px ${color}88`;
            } else if (isHighlighted) {
              boxShadow = `0 0 0 2px #1e293b, 0 0 0 3px ${color}`;
            } else if (isHovered) {
              boxShadow = `0 0 0 3px ${color}44, 0 0 14px ${color}66`;
            } else {
              boxShadow = `0 0 0 1px ${color}44`;
            }

            return (
              <div
                key={bug.id}
                className={className}
                style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, background: color, boxShadow }}
                onMouseEnter={() => onHover?.(bug.id)}
                onMouseLeave={() => onHover?.(null)}
                onClick={() => onClickItem?.(bug.id)}
              >
                {isHovered && (
                  <div className="risk-tooltip">
                    <span className="risk-tooltip-id">#{bug.id}</span>
                    <span className="risk-tooltip-title">{bug.title}</span>
                    <div className="risk-tooltip-badges">
                      <Badge value={bug.priority} type="priority" />
                      <Badge value={bug.severity} type="severity" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="risk-matrix-empty">{emptyMessage}</div>
          )}
        </div>

        <div className="risk-xaxis">
          <span>Low Impact</span>
          <span className="risk-axis-line">Severity →</span>
          <span>High Impact</span>
        </div>
      </div>

      <div className="risk-legend">
        <span className="risk-legend-title">Risk Level</span>
        {[
          { label: 'Critical', color: '#f87171' },
          { label: 'High',     color: '#fdba74' },
          { label: 'Medium',   color: '#fde047' },
          { label: 'Low',      color: '#86efac' },
        ].map(({ label, color }) => (
          <div key={label} className="risk-legend-row">
            <span className="risk-legend-dot" style={{ background: color }} />
            <span className="risk-legend-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
