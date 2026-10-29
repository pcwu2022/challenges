import { getJSON, validateGame, load, save, createState, reconcile, stats, remaining, formatTime, el, PREFIX } from './storage.js';
import { renderMarkdown } from './markdown.js';
import { initRules } from './rules.js';
const $ = selector => document.querySelector(selector);
const dialog = $('#challenge-dialog');
let game, state, active, healthy = false;
function report(error) { $('#notice').textContent = error.message; }
function refresh() { state = reconcile(game, load(game.id) || createState(game)); }
function commit(next) {
  try { save(game.id, next); state = next; return true; }
  catch { report(new Error('Progress could not be saved. Check browser storage settings or free up space, then reload.')); return false; }
}
function change(action) {
  try {
    refresh();
    const next = structuredClone(state);
    if (!action(next)) { render(); return; }
    next.lastAccessed = Date.now();
    if (commit(next)) render();
  } catch (error) { report(error); }
}
function render() {
  const progress = stats(game, state);
  $('#summary').replaceChildren(el('p', `${progress.complete}/${progress.total} completed`), el('p', `${progress.failed} failed`), el('p', `${progress.reward} points earned`));
  active = game.challenges.find(c => state.challenges[c.id].state === 'open');
  $('#challenges').replaceChildren(...state.order.map(id => {
    const c = game.challenges.find(c => c.id === id), entry = state.challenges[id];
    const resolved = ['complete', 'failed'].includes(entry.state);
    const card = el('button', undefined, `card${resolved ? ` ${entry.state}` : ''}`); card.type = 'button';
    card.append(el('span', c.public_title, 'eyebrow'));
    if (entry.state !== 'sealed') card.append(el('span', c.title, 'card-title'));
    card.append(el('span', { sealed: 'Sealed · click to reveal', open: 'Open', complete: 'Complete', failed: 'Failed' }[entry.state], 'state'));
    if (resolved) card.append(el('span', `${entry.state === 'complete' ? c.reward : 0} points earned`));
    card.disabled = !!active || resolved;
    card.addEventListener('click', () => change(next => {
      if (game.challenges.some(item => next.challenges[item.id].state === 'open') || next.challenges[id].state !== 'sealed') return false;
      const now = Date.now();
      next.challenges[id] = { state: 'open', openedAt: now, startedAt: c.time_limit?.start === 'on_open' ? now : null };
      return true;
    }));
    return card;
  }));
  if (!active) { if (dialog.open) dialog.close(); return; }
  $('#dialog-hint').textContent = active.public_title;
  $('#dialog-title').textContent = active.title;
  $('#dialog-description').innerHTML = renderMarkdown(active.description);
  $('#dialog-reward').textContent = `${active.reward} points`;
  $('#timer-area').hidden = !active.time_limit;
  tick();
  if (!dialog.open && !$('#rules-dialog').open) dialog.showModal();
}
function tick() {
  if (!active) return;
  const entry = state.challenges[active.id];
  const seconds = remaining(active, entry);
  const expired = seconds === 0;
  $('#expired').hidden = !expired;
  $('#start').hidden = !active.time_limit || entry.startedAt !== null;
  $('#timer-label').textContent = entry.startedAt === null ? 'Timer starts when you click Start timer.' : (expired ? 'Deadline reached' : 'Time remaining');
  $('#timer').textContent = formatTime(seconds ?? active.time_limit?.seconds ?? 0);
}
dialog.addEventListener('cancel', event => event.preventDefault());
$('#start').addEventListener('click', () => {
  const id = active?.id;
  change(next => {
    if (!id || next.challenges[id].state !== 'open' || next.challenges[id].startedAt !== null) return false;
    next.challenges[id].startedAt = Date.now(); return true;
  });
});
function resolve(outcome) {
  const id = active?.id;
  change(next => {
    if (!id || next.challenges[id].state !== 'open') return false;
    next.challenges[id].state = outcome; next.challenges[id].resolvedAt = Date.now(); return true;
  });
}
$('#complete').addEventListener('click', () => resolve('complete'));
$('#fail').addEventListener('click', () => resolve('failed'));
$('#restart').addEventListener('click', () => {
  if (!confirm('Restart this game? All outcomes, points, and timers will be cleared.')) return;
  try {
    refresh(); const next = createState(game); next.firstAccessed = state.firstAccessed;
    if (commit(next)) render();
  } catch (error) { report(error); }
});
function sync() {
  if (!healthy) return;
  try { refresh(); render(); } catch (error) { report(error); }
}
window.addEventListener('storage', event => { if (game && (event.key === PREFIX + game.id || event.key === null)) sync(); });
window.addEventListener('pageshow', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
setInterval(tick, 250);
try {
  game = validateGame(await getJSON('game.json'));
  refresh(); state.lastAccessed = Date.now();
  if (!commit(state)) throw new Error('Browser storage is required to play. Enable it and reload.');
  document.title = `${game.title} — Challenges`;
  $('#game-title').textContent = game.title;
  $('#game-description').textContent = game.description || '';
  if (game.sample_note) $('#source').append(el('span', game.sample_note + ' '));
  if (game.source && /^https?:\/\//.test(game.source.url)) {
    const source = el('a', game.source.label); source.href = game.source.url; source.target = '_blank'; source.rel = 'noreferrer'; $('#source').append(source);
  }
  healthy = true; $('#restart').disabled = false; render();
  initRules(game, render);
} catch (error) { $('#challenges').replaceChildren(); report(error); }
