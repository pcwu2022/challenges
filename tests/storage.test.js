import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, stats, remaining, formatTime, reconcile, validateGame, save, load } from '../assets/storage.js';
const game = validateGame(JSON.parse(await readFile(new URL('../games/schengen-showdown/game.json', import.meta.url))));
test('new game is sealed with a complete random permutation', () => {
  const state = createState(game, 1000);
  assert.deepEqual([...state.order].sort(), game.challenges.map(c => c.id).sort());
  assert.ok(Object.values(state.challenges).every(c => c.state === 'sealed'));
  assert.equal(stats(game, state).reward, 0);
});
test('only successful challenges award points', () => {
  const state = createState(game);
  state.challenges.austria.state = 'complete'; state.challenges.belgium.state = 'failed';
  assert.deepEqual(stats(game, state), { complete: 1, failed: 1, total: game.challenges.length, reward: 100 });
});
test('deadline survives serialization, reload, and time away', () => {
  const data = new Map(); globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const state = createState(game, 1000); const c = game.challenges.find(c => c.id === 'slovakia');
  state.challenges[c.id] = { state: 'open', openedAt: 1000, startedAt: 1000 };
  save(game.id, state); const entry = load(game.id).challenges[c.id];
  assert.equal(remaining(c, entry, 2000), 3599);
  assert.equal(remaining(c, entry, 3601000), 0);
  assert.equal(remaining(c, entry, 99999999), 0);
  assert.equal(entry.state, 'open');
});
test('manual timer waits for start and formats minutes beyond 59', () => {
  const c = game.challenges.find(c => c.id === 'denmark');
  assert.equal(remaining(c, { startedAt: null }, 999999), null);
  assert.equal(remaining(c, { startedAt: 1000 }, 2000), 2699);
  assert.equal(formatTime(3600), '60:00'); assert.equal(formatTime(0), '00:00');
});
test('restart clears outcomes and timers', () => {
  const state = createState(game);
  state.challenges.austria.state = 'complete';
  const reset = createState(game);
  assert.equal(stats(game, reset).complete, 0);
  assert.ok(Object.values(reset.challenges).every(c => c.state === 'sealed' && c.startedAt === null));
});
test('configuration edits preserve progress and add sealed challenges', () => {
  const state = createState(game); state.challenges.austria.state = 'complete'; state.order.push('removed');
  const updated = structuredClone(game); updated.challenges.push({ id: 'new', title: 'New', public_title: 'New', description: '', reward: 10 });
  const result = reconcile(updated, state);
  assert.equal(result.challenges.austria.state, 'complete'); assert.equal(result.challenges.new.state, 'sealed'); assert.ok(!result.order.includes('removed'));
});
test('invalid timer configurations and multiple open challenges are rejected', () => {
  const invalid = structuredClone(game); invalid.challenges[0].time_limit = { seconds: -1, start: 'manual' };
  assert.throws(() => validateGame(invalid));
  const state = createState(game); for (const id of ['austria', 'belgium']) state.challenges[id] = { state: 'open', openedAt: 1, startedAt: null };
  assert.throws(() => reconcile(game, state));
});
