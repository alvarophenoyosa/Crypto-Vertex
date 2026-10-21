import type { Candidate } from './scoring.ts';

export interface EarlyMoverAssessment {
  score: number;
  tier: 'PRIME' | 'EMERGING' | 'FORMING' | 'WEAK';
  reasons: string[];
}

/**
 * Ranking overlay for discovery, not a trade trigger. Rewards fresh acceleration,
 * abnormal volume and confirming OI/book flow; penalises already-extended moves.
 * Missing inputs contribute nothing rather than being fabricated as neutral evidence.
 */
export function assessEarlyMover(candidate: Candidate): EarlyMoverAssessment {
  const m = candidate.metrics;
  const sign = candidate.direction === 'LONG' ? 1 : -1;
  let weighted = 0;
  let availableWeight = 0;
  let penaltyPoints = 0;
  const reasons: string[] = [];
  const add = (weight: number, value: number | undefined, positive: string) => {
    if (value === undefined || !Number.isFinite(value)) return;
    const bounded = Math.max(0, Math.min(100, value));
    weighted += weight * bounded;
    availableWeight += weight;
    if (bounded >= 60) reasons.push(positive);
  };

  const volumeZ = typeof m.volumeZ === 'number' ? m.volumeZ : undefined;
  add(30, volumeZ === undefined ? undefined : Math.max(0, Math.min(100, volumeZ / 4 * 100)), 'abnormal 5m volume');
  const accelZ = typeof m.accelZ === 'number' ? m.accelZ * sign : undefined;
  add(20, accelZ === undefined ? undefined : Math.max(0, Math.min(100, (accelZ + 0.25) / 1.75 * 100)), 'directional acceleration');
  const ret5 = typeof m.retMin5x3 === 'number' ? m.retMin5x3 * sign : undefined;
  add(15, ret5 === undefined ? undefined : Math.max(0, Math.min(100, (ret5 + 0.15) / 0.8 * 100)), 'short-window momentum aligned');
  const oi = typeof m.oiChange30mPct === 'number' ? m.oiChange30mPct : undefined;
  const price30 = typeof m.price30mPct === 'number' ? m.price30mPct * sign : undefined;
  const oiScore = oi === undefined || price30 === undefined ? undefined
    : oi > 0 && price30 > 0 ? Math.max(0, Math.min(100, 50 + Math.min(oi, 10) * 5 + Math.min(price30, 10) * 3))
    : oi < 0 && price30 > 0 ? 25 : 0;
  add(15, oiScore, 'open interest supports directional move');
  const imbalance = typeof m.bookImbalance === 'number' ? m.bookImbalance * sign : undefined;
  add(10, imbalance === undefined ? undefined : Math.max(0, Math.min(100, (imbalance + 0.15) / 0.65 * 100)), 'order-book imbalance aligned');

  // Extension penalties stop this overlay from rewarding coins that have already sprinted.
  const move = typeof m.moveLookbackPct === 'number' ? m.moveLookbackPct : undefined;
  if (move !== undefined && move * sign > 5) {
    const penalty = Math.min(30, (move * sign - 5) * 2);
    penaltyPoints += penalty;
    reasons.push('extension penalty applied');
  }
  const dayMove = typeof m.change24hPct === 'number' ? m.change24hPct * sign : undefined;
  if (dayMove !== undefined && dayMove > 18) {
    const penalty = Math.min(20, (dayMove - 18) * 0.8);
    penaltyPoints += penalty;
    reasons.push('24h chase penalty applied');
  }
  const score = availableWeight > 0 ? Math.round(Math.max(0, Math.min(100, weighted / availableWeight - penaltyPoints))) : 0;
  const tier = score >= 75 ? 'PRIME' : score >= 60 ? 'EMERGING' : score >= 40 ? 'FORMING' : 'WEAK';
  if (reasons.length === 0) reasons.push('insufficient early-move confirmation');
  return { score, tier, reasons };
}
