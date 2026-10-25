import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/config.ts';
import { applyStrategyMode, STRATEGY_MODES, type StrategyMode } from '../src/engine/modes.ts';

test('each mode returns a fresh config and leaves the base config untouched', () => {
  const before = structuredClone(DEFAULT_CONFIG);
  for (const mode of Object.keys(STRATEGY_MODES) as StrategyMode[]) {
    const next = applyStrategyMode(DEFAULT_CONFIG, mode);
    assert.notEqual(next, DEFAULT_CONFIG);
    assert.deepEqual(DEFAULT_CONFIG, before);
    assert.equal(next.risk.leverage <= 3, true);
    assert.equal(next.risk.riskFractionOfEquity <= 0.02, true);
    assert.ok(Math.abs(Object.values(next.weights).reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
    assert.ok(next.thresholds.confirmScore >= next.thresholds.watchScore);
  }
});

test('scalping is shorter and more conservative than holding/swing', () => {
  const scalp = applyStrategyMode(DEFAULT_CONFIG, 'SCALPING');
  const holding = applyStrategyMode(DEFAULT_CONFIG, 'HOLDING');
  const swing = applyStrategyMode(DEFAULT_CONFIG, 'SWING');
  assert.ok(scalp.risk.maxHoldMinutes < holding.risk.maxHoldMinutes);
  assert.ok(holding.risk.maxHoldMinutes < swing.risk.maxHoldMinutes);
  assert.ok(scalp.thresholds.confirmScore > DEFAULT_CONFIG.thresholds.confirmScore);
  assert.ok(swing.risk.leverage <= DEFAULT_CONFIG.risk.leverage);
});

test('unknown mode is rejected rather than silently selecting a default', () => {
  assert.throws(() => applyStrategyMode(DEFAULT_CONFIG, 'DAYTRADE' as StrategyMode), /unknown strategy mode/);
});
