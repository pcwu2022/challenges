import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../assets/markdown.js';

test('challenge descriptions support emphasis and line breaks', () => {
  assert.equal(renderMarkdown('Plain *italic* and **bold**\nNext\\nLast'), 'Plain <em>italic</em> and <strong>bold</strong><br>Next<br>Last');
  assert.equal(renderMarkdown('***both***'), '<strong><em>both</em></strong>');
  assert.equal(renderMarkdown('**bold with *italic* inside**'), '<strong>bold with <em>italic</em> inside</strong>');
  assert.equal(renderMarkdown('Unmatched * stays'), 'Unmatched * stays');
});

test('source HTML stays inert while markdown is rendered', () => {
  assert.equal(renderMarkdown('<img src=x onerror=alert(1)> **A & B**'), '&lt;img src=x onerror=alert(1)&gt; <strong>A &amp; B</strong>');
});
