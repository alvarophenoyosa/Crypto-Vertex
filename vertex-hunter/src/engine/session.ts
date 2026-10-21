/**
 * MEXC Futures daily-mover session clock.
 *
 * The leaderboard session rolls at 21:00 Pakistan Standard Time (Asia/Karachi),
 * independent of the server's timezone. This module deliberately does not place
 * trades: it provides deterministic session boundaries and rank snapshots for
 * the scanner/UI to consume.
 */
export const SESSION_TIME_ZONE = 'Asia/Karachi';
export const SESSION_RESET_HOUR = 21;

export interface MoverInput {
  symbol: string;
  change24hPct: number | undefined;
  eligibleFutures: boolean;
}

export interface RankedMover extends MoverInput {
  rank: number;
}

export interface MoverSnapshot {
  sessionKey: string;
  sessionStartedAt: number;
  capturedAt: number;
  gainers: RankedMover[];
  losers: RankedMover[];
}

function pktParts(timestamp: number): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SESSION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour') };
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Return the most recent 21:00 PKT boundary at or before timestamp. */
export function getMoverSession(timestamp: number): { sessionKey: string; sessionStartedAt: number } {
  if (!Number.isFinite(timestamp)) throw new Error('timestamp must be finite');
  const p = pktParts(timestamp);
  // Pakistan is UTC+05:00 year-round. Build the local boundary as an explicit UTC instant.
  const boundaryUtc = Date.UTC(p.year, p.month - 1, p.day, SESSION_RESET_HOUR - 5, 0, 0, 0);
  const start = p.hour >= SESSION_RESET_HOUR ? boundaryUtc : boundaryUtc - 86_400_000;
  const startDate = new Date(start + 5 * 60 * 60_000);
  return {
    sessionKey: dateKey(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, startDate.getUTCDate()),
    sessionStartedAt: start,
  };
}

/**
 * Capture the current eligible Futures gainers/losers. This is a ranking snapshot,
 * not an entry signal: callers must still run qualifying setup, liquidity and risk checks.
 */
export function rankMoverSnapshot(inputs: MoverInput[], capturedAt: number, limit = 100): MoverSnapshot {
  if (!Number.isFinite(capturedAt)) throw new Error('capturedAt must be finite');
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer');
  const session = getMoverSession(capturedAt);
  const eligible = inputs.filter((x) =>
    x.eligibleFutures && Number.isFinite(x.change24hPct) && x.symbol.trim().length > 0,
  );
  const gainers = eligible
    .filter((x) => (x.change24hPct as number) > 0)
    .sort((a, b) => (b.change24hPct as number) - (a.change24hPct as number))
    .slice(0, limit)
    .map((x, i) => ({ ...x, change24hPct: x.change24hPct as number, rank: i + 1 }));
  const losers = eligible
    .filter((x) => (x.change24hPct as number) < 0)
    .sort((a, b) => (a.change24hPct as number) - (b.change24hPct as number))
    .slice(0, limit)
    .map((x, i) => ({ ...x, change24hPct: x.change24hPct as number, rank: i + 1 }));
  return { ...session, capturedAt, gainers, losers };
}
