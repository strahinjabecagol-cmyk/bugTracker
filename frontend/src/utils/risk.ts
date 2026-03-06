import type { Bug } from '../types';

export const PRIORITY_SCORE: Record<Bug['priority'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const SEVERITY_SCORE: Record<Bug['severity'], number> = {
  minor: 1,
  major: 2,
  critical: 3,
  blocker: 4,
};

export const RISK_COLOR: Record<number, string> = {
  1: '#86efac',
  2: '#fde047',
  3: '#fdba74',
  4: '#f87171',
};

export function riskColor(bug: Bug): string {
  return RISK_COLOR[Math.max(PRIORITY_SCORE[bug.priority], SEVERITY_SCORE[bug.severity])];
}

export function dotPosition(bug: Bug): { x: number; y: number } {
  const sx = (SEVERITY_SCORE[bug.severity] - 1) / 3;
  const sy = 1 - (PRIORITY_SCORE[bug.priority] - 1) / 3;
  const jx = ((bug.id * 7) % 13 - 6) * 0.022;
  const jy = ((bug.id * 11) % 13 - 6) * 0.022;
  return {
    x: Math.min(Math.max(sx + jx, 0.03), 0.97),
    y: Math.min(Math.max(sy + jy, 0.03), 0.97),
  };
}

export function quadrantLabel(bug: Bug): 'critical' | 'monitor' | 'plan' | 'low_risk' {
  const ps = PRIORITY_SCORE[bug.priority];
  const ss = SEVERITY_SCORE[bug.severity];
  if (ps > 2 && ss > 2) return 'critical';
  if (ps > 2 && ss <= 2) return 'monitor';
  if (ps <= 2 && ss > 2) return 'plan';
  return 'low_risk';
}
