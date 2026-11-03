import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREFIX } from '../assets/storage.js';

test('resolved cards reopen without changing outcomes, rewards, or timers', async t => {
  const originals = Object.fromEntries(['document', 'window', 'localStorage', 'fetch', 'setInterval'].map(k => [k, globalThis[k]]));
  t.after(() => Object.assign(globalThis, originals));
  class Node {
    children = []; listeners = {}; open = false;
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    click() { if (!this.disabled) this.listeners.click?.(); }
  }
  const nodes = new Map();
  const get = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  globalThis.document = { querySelector: get, querySelectorAll: () => [], createElement: () => new Node(), addEventListener() {} };
  globalThis.window = { addEventListener() {} };
  globalThis.setInterval = () => {};
  const challenges = ['complete', 'failed', 'sealed'].map((status, i) => ({ id: status, title: status, public_title: status, description: status, reward: 100, time_limit: { seconds: 60, start: 'manual' } }));
  const state = { version: 1, order: challenges.map(c => c.id), challenges: Object.fromEntries(challenges.map(c => [c.id, { state: c.id, openedAt: 1, startedAt: 2, resolvedAt: 3 }])) };
  const storage = new Map([[PREFIX + 'test', JSON.stringify(state)], [PREFIX + 'test:rules-seen', 'true']]);
  globalThis.localStorage = { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ id: 'test', title: 'Test', randomize: false, challenges }) });
  await import('../assets/game.js');
  const saved = storage.get(PREFIX + 'test');
  for (const index of [0, 1]) {
    get('#challenges').children[index].click();
    assert.equal(get('#challenge-dialog').open, true);
    assert.equal(get('#complete').hidden, true);
    assert.equal(get('#fail').hidden, true);
    assert.equal(get('#start').hidden, true);
    assert.equal(get('#timer-area').hidden, true);
    assert.equal(get('#close-challenge').hidden, false);
    assert.equal(storage.get(PREFIX + 'test'), saved);
    get('#complete').click();
    get('#fail').click();
    get('#start').click();
    assert.equal(storage.get(PREFIX + 'test'), saved);
    get('#close-challenge').click();
    assert.equal(get('#challenge-dialog').open, false);
  }
  get('#challenges').children[2].click();
  assert.equal(get('#complete').hidden, false);
  assert.equal(get('#fail').hidden, false);
  assert.equal(get('#close-challenge').hidden, true);
  get('#challenge-dialog').listeners.cancel({ preventDefault() {} });
  assert.equal(get('#challenge-dialog').open, true);
  get('#complete').click();
  assert.equal(get('#challenge-dialog').open, false);
  assert.equal(JSON.parse(storage.get(PREFIX + 'test')).challenges.sealed.state, 'complete');
});
