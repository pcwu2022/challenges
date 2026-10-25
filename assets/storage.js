export const PREFIX = 'challenge-revealer:v1:';
export function load(id) {
  const raw = localStorage.getItem(PREFIX + id);
  if (!raw) return null;
  const state = JSON.parse(raw);
  if (!state || state.version !== 1 || !Array.isArray(state.order) || !state.challenges || typeof state.challenges !== 'object') {
    throw new Error('Saved progress is invalid. Restore your browser data or remove this game’s storage entry to reset it.');
  }
  return state;
}
export function save(id, state) { localStorage.setItem(PREFIX + id, JSON.stringify(state)); }
export function shuffle(ids) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createState(game, now = Date.now()) {
  return { version: 1, firstAccessed: now, lastAccessed: now, order: shuffle(game.challenges.map(c => c.id)),
    challenges: Object.fromEntries(game.challenges.map(c => [c.id, { state: 'sealed', openedAt: null, startedAt: null }])) };
}
export function reconcile(game, state) {
  const ids = game.challenges.map(c => c.id);
  state.order = [...new Set(state.order)].filter(id => ids.includes(id));
  state.order.push(...shuffle(ids.filter(id => !state.order.includes(id))));
  for (const c of game.challenges) {
    const entry = state.challenges[c.id];
    if (!entry) state.challenges[c.id] = { state: 'sealed', openedAt: null, startedAt: null };
    else if (!['sealed', 'open', 'complete', 'failed'].includes(entry.state) ||
      (entry.state === 'open' && (!Number.isFinite(entry.openedAt) ||
      (entry.startedAt !== null && !Number.isFinite(entry.startedAt))))) throw new Error('Saved challenge state is invalid.');
  }
  if (game.challenges.filter(c => state.challenges[c.id].state === 'open').length > 1) throw new Error('Saved progress contains multiple open challenges.');
  return state;
}
export function stats(game, state) {
  const complete = game.challenges.filter(c => state?.challenges[c.id]?.state === 'complete');
  const failed = game.challenges.filter(c => state?.challenges[c.id]?.state === 'failed').length;
  return { complete: complete.length, failed, total: game.challenges.length, reward: complete.reduce((n, c) => n + c.reward, 0) };
}
export function remaining(challenge, entry, now = Date.now()) {
  if (!challenge.time_limit || entry.startedAt === null) return null;
  return Math.max(0, Math.ceil((entry.startedAt + challenge.time_limit.seconds * 1000 - now) / 1000));
}
export function formatTime(seconds) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
export async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
  return response.json();
}
export function validateGame(game) {
  if (!game || !/^[a-z0-9-]+$/.test(game.id) || typeof game.title !== 'string' || !Array.isArray(game.challenges) || !game.challenges.length) throw new Error('Invalid game configuration.');
  const ids = new Set();
  for (const c of game.challenges) {
    if (typeof c.id !== 'string' || !/^[a-z0-9-]+$/.test(c.id) || ids.has(c.id) || !['public_title', 'title', 'description'].every(k => typeof c[k] === 'string') || !Number.isFinite(c.reward) || c.reward < 0 ||
      (c.time_limit && (!Number.isInteger(c.time_limit.seconds) || c.time_limit.seconds <= 0 || !['manual', 'on_open'].includes(c.time_limit.start)))) throw new Error('Invalid challenge configuration.');
    ids.add(c.id);
  }
  return game;
}
export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
