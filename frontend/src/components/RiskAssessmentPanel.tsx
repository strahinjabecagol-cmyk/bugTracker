import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bug } from '../types';
import Badge from './Badge';
import RiskMatrix from './RiskMatrix';
import { PRIORITY_SCORE, SEVERITY_SCORE, quadrantLabel, riskColor } from '../utils/risk';
import { getBugs } from '../api';

interface RiskAssessmentPanelProps {
  bug: Bug;
}

export default function RiskAssessmentPanel({ bug }: RiskAssessmentPanelProps) {
  const navigate = useNavigate();
  const [projectBugs, setProjectBugs] = useState<Bug[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    getBugs({ project_id: bug.project_id }).then(setProjectBugs).catch(() => {});
  }, [bug.project_id]);

  const ps = PRIORITY_SCORE[bug.priority];
  const ss = SEVERITY_SCORE[bug.severity];
  const totalScore = ps + ss;
  const ql = quadrantLabel(bug);
  const color = riskColor(bug);

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
            <Badge value={bug.priority} type="priority" />
            <span className="risk-score-num">×{ps}</span>
          </div>
          <div className="risk-score-row">
            <span className="risk-score-label">Severity</span>
            <Badge value={bug.severity} type="severity" />
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
            items={projectBugs}
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
