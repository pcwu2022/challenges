import { getJSON, validateGame, load, stats, el } from './storage.js';
const list = document.querySelector('#games');
const date = value => value ? new Date(value).toLocaleString() : 'Not accessed yet';
async function render() {
  try {
    const entries = await getJSON('games/index.json');
    const results = await Promise.all(entries.map(async entry => {
      const game = validateGame(await getJSON(`games/${entry.path}game.json`));
      if (game.id !== entry.id) throw new Error('Game ID does not match the catalog.');
      const state = load(game.id);
      const progress = stats(game, state);
      const card = el('article', undefined, 'card');
      card.append(el('h2', game.title));
      const details = el('dl');
      for (const [label, value] of [['First accessed', date(state?.firstAccessed)], ['Last accessed', date(state?.lastAccessed)]]) details.append(el('dt', label), el('dd', value));
      const meter = el('progress'); meter.max = progress.total; meter.value = progress.complete;
      meter.setAttribute('aria-label', `${progress.complete} of ${progress.total} completed`);
      card.append(details, meter, el('p', `${progress.complete}/${progress.total} challenges completed · ${progress.failed} failed`), el('p', `${progress.reward} points earned`));
      const link = el('a', state ? 'Continue game' : 'Open game', 'button');
      link.href = `games/${entry.path}index.html`; card.append(link);
      return card;
    }));
    list.replaceChildren(...results);
  } catch (error) { list.replaceChildren(); document.querySelector('#notice').textContent = `${error.message} Serve the project through HTTP (see README).`; }
}
document.querySelector('#restart-all').addEventListener('click', async () => {
  if (!confirm('Restart all games? This clears all local storage for this site, including saved progress, timers, visit history, and rules preferences. This cannot be undone.')) return;
  const notice = document.querySelector('#notice');
  try {
    localStorage.clear();
  } catch {
    notice.textContent = 'Saved data could not be cleared. Check browser storage settings and try again.';
    return;
  }
  notice.textContent = 'All games have been reset.';
  await render();
});
window.addEventListener('storage', render);
window.addEventListener('pageshow', render);
