import test from 'node:test';
import assert from 'node:assert/strict';
import { getMoverSession, rankMoverSnapshot } from '../src/engine/session.ts';

const pkt = (iso: string) => Date.parse(iso);

test('mover session rolls at 21:00 Pakistan time, not server-local time', () => {
  const before = getMoverSession(pkt('2026-10-21T15:59:59.000Z')); // 20:59:59 PKT
  const at = getMoverSession(pkt('2026-10-21T16:00:00.000Z')); // 21:00:00 PKT
  assert.equal(before.sessionKey, '2026-10-20');
  assert.equal(before.sessionStartedAt, pkt('2026-10-20T16:00:00.000Z'));
  assert.equal(at.sessionKey, '2026-10-21');
  assert.equal(at.sessionStartedAt, pkt('2026-10-21T16:00:00.000Z'));
});

test('snapshot ranks eligible Futures separately for gainers and losers', () => {
  const snapshot = rankMoverSnapshot([
    { symbol: 'UP2_USDT', change24hPct: 12, eligibleFutures: true },
    { symbol: 'UP1_USDT', change24hPct: 30, eligibleFutures: true },
    { symbol: 'DOWN1_USDT', change24hPct: -18, eligibleFutures: true },
    { symbol: 'SPOT_ONLY', change24hPct: 90, eligibleFutures: false },
    { symbol: 'UNKNOWN_USDT', change24hPct: undefined, eligibleFutures: true },
    { symbol: 'FLAT_USDT', change24hPct: 0, eligibleFutures: true },
  ], pkt('2026-10-21T16:10:00.000Z'));
  assert.deepEqual(snapshot.gainers.map((x) => [x.symbol, x.rank]), [['UP1_USDT', 1], ['UP2_USDT', 2]]);
  assert.deepEqual(snapshot.losers.map((x) => [x.symbol, x.rank]), [['DOWN1_USDT', 1]]);
  assert.equal(snapshot.sessionKey, '2026-10-21');
});

test('ranking limit is validated and applied', () => {
  const now = pkt('2026-10-21T16:10:00.000Z');
  const inputs = [3, 2, 1].map((n) => ({ symbol: `UP${n}`, change24hPct: n, eligibleFutures: true }));
  assert.equal(rankMoverSnapshot(inputs, now, 2).gainers.length, 2);
  assert.throws(() => rankMoverSnapshot(inputs, now, 0), /positive integer/);
});
