import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bug } from '../types';
import Badge from './Badge';
import RiskMatrix from './RiskMatrix';
import { PRIORITY_SCORE, SEVERITY_SCORE, quadrantLabel, riskColor } from '../utils/risk';
import { useProjectBugs } from '../hooks/useProjectBugs';

interface RiskAssessmentPanelProps {
  bug: Bug;
}

export default function RiskAssessmentPanel({ bug }: RiskAssessmentPanelProps) {
  const navigate = useNavigate();
  const { bugs: projectBugs } = useProjectBugs(bug.project_id);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const liveBug = projectBugs.find((b) => b.id === bug.id) ?? bug;
  const ps = PRIORITY_SCORE[liveBug.priority];
  const ss = SEVERITY_SCORE[liveBug.severity];
  const totalScore = ps + ss;
  const ql = quadrantLabel(liveBug);
  const color = riskColor(liveBug);

  return (
    <div className="detail-card risk-assessment-panel">
      <div className="risk-assessment-header">
        <h2 className="risk-assessment-title">Risk Assessment</h2>
        <p className="risk-assessment-subtitle">
          This item plotted against all items in the project. Hover any dot to inspect it.
        </p>
      </div>

      <div className="risk-assessment-body">
        <div className="risk-current-scores">
          <div className="risk-score-row">
            <span className="risk-score-label">Priority</span>
            <Badge value={liveBug.priority} type="priority" />
            <span className="risk-score-num">×{ps}</span>
          </div>
          <div className="risk-score-row">
            <span className="risk-score-label">Severity</span>
            <Badge value={liveBug.severity} type="severity" />
            <span className="risk-score-num">×{ss}</span>
          </div>
          <div className="risk-score-total">
            <span className="risk-score-label">Score</span>
            <span className="risk-score-value" style={{ color }}>{totalScore} / 8</span>
          </div>
          <div className="risk-score-total">
            <span className="risk-score-label">Quadrant</span>
            <Badge value={ql} type="quadrant" />
          </div>
        </div>

        <div className="risk-panel-matrix">
          <RiskMatrix
            items={projectBugs.filter((b) => b.status === 'open' || b.status === 'in_progress')}
            highlightId={bug.id}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onClickItem={(id) => id !== bug.id && navigate(`/bugs/${id}`)}
          />
        </div>
      </div>
    </div>
  );
}
