/**
 * Explicit paper-strategy profiles.
 *
 * These presets tune the existing scanner and virtual-wallet controls only; they
 * are not evidence of profitability and must remain paper-trading-only until
 * each profile has adequate out-of-sample validation.
 */
import type { AppConfig } from '../config.ts';

export type StrategyMode = 'SCALPING' | 'HOLDING' | 'SWING';

type ModePreset = {
  label: string;
  description: string;
  weights: Partial<AppConfig['weights']>;
  thresholds: Partial<AppConfig['thresholds']>;
  risk: Partial<AppConfig['risk']>;
};

export const STRATEGY_MODES: Record<StrategyMode, ModePreset> = {
  SCALPING: {
    label: 'Scalping',
    description: 'Short holding window; stricter entry confirmation and smaller paper risk.',
    weights: { volume: 0.22, momentum: 0.24, volatility: 0.12, breakout: 0.12, openInterest: 0.14, orderBook: 0.1, funding: 0.03, liquidity: 0.03 },
    thresholds: { watchScore: 50, confirmScore: 68, lateEntryMovePct: 4, lateEntryLookbackBars: 6, max24hMovePct: 18, maxAbsFundingRate: 0.0015 },
    risk: { leverage: 3, riskFractionOfEquity: 0.01, maxMarginFractionOfEquity: 0.2, maxOpenPositions: 2, stopAtrMultiple: 1.5, targetRMultiple: 1.5, minStopPct: 0.5, maxStopPct: 3, slippageBps: 10, maxHoldMinutes: 45, dailyLossLimitPct: 3, cooldownMinutesPerSymbol: 30 },
  },
  HOLDING: {
    label: 'Holding',
    description: 'Intraday-to-multi-session paper setups with balanced momentum, OI and funding.',
    weights: { volume: 0.2, momentum: 0.2, volatility: 0.1, breakout: 0.15, openInterest: 0.15, orderBook: 0.05, funding: 0.1, liquidity: 0.05 },
    thresholds: { watchScore: 47, confirmScore: 65, lateEntryMovePct: 8, lateEntryLookbackBars: 18, max24hMovePct: 28, maxAbsFundingRate: 0.002 },
    risk: { leverage: 2, riskFractionOfEquity: 0.015, maxMarginFractionOfEquity: 0.25, maxOpenPositions: 3, stopAtrMultiple: 2.2, targetRMultiple: 2.5, minStopPct: 0.8, maxStopPct: 5, slippageBps: 8, maxHoldMinutes: 1440, dailyLossLimitPct: 4, cooldownMinutesPerSymbol: 90 },
  },
  SWING: {
    label: 'Swing',
    description: 'Lower-leverage, wider-stop profile; current signals still use 5m/15m/1h inputs, so validate before use.',
    weights: { volume: 0.15, momentum: 0.2, volatility: 0.1, breakout: 0.18, openInterest: 0.15, orderBook: 0.04, funding: 0.12, liquidity: 0.06 },
    thresholds: { watchScore: 48, confirmScore: 67, lateEntryMovePct: 10, lateEntryLookbackBars: 36, max24hMovePct: 35, maxAbsFundingRate: 0.0015 },
    risk: { leverage: 2, riskFractionOfEquity: 0.01, maxMarginFractionOfEquity: 0.2, maxOpenPositions: 3, stopAtrMultiple: 2.8, targetRMultiple: 3, minStopPct: 1.2, maxStopPct: 6, slippageBps: 8, maxHoldMinutes: 10080, dailyLossLimitPct: 4, cooldownMinutesPerSymbol: 240 },
  },
};

/** Return a new validated config; the caller is responsible for versioned persistence. */
export function applyStrategyMode(base: AppConfig, mode: StrategyMode): AppConfig {
  const preset = STRATEGY_MODES[mode];
  if (!preset) throw new Error(`unknown strategy mode: ${String(mode)}`);
  const next: AppConfig = {
    ...base,
    weights: { ...base.weights, ...preset.weights },
    thresholds: { ...base.thresholds, ...preset.thresholds },
    risk: { ...base.risk, ...preset.risk },
  };
  // Keep the scoring weights normalised for readability, even though evaluate()
  // already renormalises across components that are available.
  const total = Object.values(next.weights).reduce((sum, value) => sum + value, 0);
  next.weights = Object.fromEntries(Object.entries(next.weights).map(([key, value]) => [key, value / total])) as AppConfig['weights'];
  return next;
}
