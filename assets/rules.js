import { renderRulesMarkdown } from './markdown.js';
import { PREFIX } from './storage.js';

export function initRules(game, onClose) {
  const dialog = document.querySelector('#rules-dialog');
  const content = document.querySelector('#rules-content');
  const seenKey = `${PREFIX}${game.id}:rules-seen`;
  let loaded = false, request;

  async function showRules() {
    if (!dialog.open) { dialog.showModal(); dialog.scrollTop = 0; }
    if (loaded || request) return;
    content.textContent = 'Loading rules…';
    request = (async () => {
      try {
        const response = await fetch('rules.md');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        content.innerHTML = renderRulesMarkdown(await response.text());
        loaded = true;
      } catch {
        content.textContent = 'Rules could not be loaded. Close this window and select View rules to retry.';
      } finally { request = null; }
    })();
    await request;
  }

  document.querySelectorAll('[data-view-rules]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', showRules);
  });
  document.querySelector('#close-rules').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (loaded) {
      try { localStorage.setItem(seenKey, 'true'); } catch {}
    }
    onClose();
  });
  let seen = false;
  try { seen = localStorage.getItem(seenKey) === 'true'; } catch {}
  if (!seen) showRules();
}
