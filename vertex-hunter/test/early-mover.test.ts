import test from 'node:test';
import assert from 'node:assert/strict';
import { assessEarlyMover } from '../src/engine/early-mover.ts';
import type { Candidate } from '../src/engine/scoring.ts';

function candidate(metrics: Candidate['metrics'], direction: Candidate['direction'] = 'LONG'): Candidate {
  return {
    symbol: 'TEST_USDT', direction, state: 'LONG_WATCH', score: 70, rawScore: 70,
    components: [], penalties: [], reasons: [], unavailable: [],
    filters: { passed: true, failures: [] }, risk: { level: 'MEDIUM', flags: [] },
    entryRef: 1, metrics, confirmed: false, evaluatedAt: 1,
  };
}

test('strong early flow ranks above weak/noisy flow', () => {
  const strong = assessEarlyMover(candidate({
    volumeZ: 3.5, accelZ: 1.1, retMin5x3: 0.45,
    oiChange30mPct: 4, price30mPct: 2, bookImbalance: 0.3,
    moveLookbackPct: 2, change24hPct: 6,
  }));
  const weak = assessEarlyMover(candidate({ volumeZ: 0.2, accelZ: -0.4, retMin5x3: -0.1 }));
  assert.ok(strong.score > weak.score);
  assert.ok(['PRIME', 'EMERGING'].includes(strong.tier));
});

test('short ranking interprets negative momentum and negative book imbalance as aligned', () => {
  const short = assessEarlyMover(candidate({
    volumeZ: 3, accelZ: -1, retMin5x3: -0.4,
    oiChange30mPct: 4, price30mPct: -2, bookImbalance: -0.3,
    moveLookbackPct: -2, change24hPct: -6,
  }, 'SHORT'));
  const opposite = assessEarlyMover(candidate({
    volumeZ: 3, accelZ: 1, retMin5x3: 0.4, bookImbalance: 0.3,
  }, 'SHORT'));
  assert.ok(short.score > opposite.score);
});

test('missing inputs are not treated as positive evidence', () => {
  const a = assessEarlyMover(candidate({}));
  assert.equal(a.score, 0);
  assert.equal(a.tier, 'WEAK');
});
