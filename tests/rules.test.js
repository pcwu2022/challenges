import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initRules } from '../assets/rules.js';
import { PREFIX } from '../assets/storage.js';

function setup(t, { seen = false, fail = false } = {}) {
  const originals = { document: globalThis.document, fetch: globalThis.fetch, localStorage: globalThis.localStorage };
  t.after(() => Object.assign(globalThis, originals));
  const listeners = new Map();
  const content = {};
  const buttons = [0, 1].map(() => ({ disabled: true, addEventListener: (_, callback) => { buttonsCallbacks.push(callback); } }));
  const buttonsCallbacks = [];
  let closeButton, fetches = 0, closes = 0;
  const dialog = {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; listeners.get('close')(); },
    addEventListener: (name, callback) => listeners.set(name, callback),
  };
  const storage = new Map(seen ? [[`${PREFIX}example:rules-seen`, 'true']] : []);
  globalThis.document = {
    querySelector: selector => ({ '#rules-dialog': dialog, '#rules-content': content, '#close-rules': { addEventListener: (_, callback) => { closeButton = callback; } } })[selector],
    querySelectorAll: () => buttons,
  };
  globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  globalThis.fetch = async () => { fetches++; return { ok: !fail, text: async () => '# Test rules' }; };
  initRules({ id: 'example' }, () => { closes++; });
  return { dialog, content, buttons, storage, show: () => buttonsCallbacks[0](), close: () => closeButton(), get fetches() { return fetches; }, get closes() { return closes; } };
}

test('first visit opens rules and dismissal persists independently of game progress', async t => {
  const ui = setup(t);
  assert.equal(ui.dialog.open, true);
  await ui.show();
  // Let the initial request finish before dismissing.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.content.innerHTML, '<h1>Test rules</h1>');
  assert.ok(ui.buttons.every(button => !button.disabled));
  ui.close();
  assert.equal(ui.dialog.open, false);
  assert.equal(ui.storage.get(`${PREFIX}example:rules-seen`), 'true');
  assert.equal(ui.closes, 1);
  await ui.show();
  assert.equal(ui.dialog.open, true);
  assert.equal(ui.fetches, 1);
});

test('return visits wait for View rules', async t => {
  const ui = setup(t, { seen: true });
  assert.equal(ui.dialog.open, false);
  assert.equal(ui.fetches, 0);
  await ui.show();
  assert.equal(ui.dialog.open, true);
  assert.equal(ui.content.innerHTML, '<h1>Test rules</h1>');
});

test('failed loads are not marked seen and can be retried', async t => {
  const ui = setup(t, { seen: true, fail: true });
  ui.storage.clear();
  await ui.show();
  assert.match(ui.content.textContent, /could not be loaded/);
  ui.close();
  assert.equal(ui.storage.size, 0);
  await ui.show();
  assert.equal(ui.fetches, 2);
});
