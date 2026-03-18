// Claude Haiku 4.5 pricing (claude-haiku-4-5-20251001)
// $1.00 per 1M input tokens, $5.00 per 1M output tokens
const PRICE_IN  = 1 / 1_000_000;
const PRICE_OUT = 5 / 1_000_000;

export function calcCostDollars(tokensIn: number, tokensOut: number): number {
  return tokensIn * PRICE_IN + tokensOut * PRICE_OUT;
}

export function formatCost(dollars: number): string {
  if (dollars === 0) return '$0.0000';
  return `$${dollars.toFixed(4)}`;
}
