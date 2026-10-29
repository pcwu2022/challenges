import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, renderRulesMarkdown } from '../assets/markdown.js';

test('challenge descriptions support emphasis and line breaks', () => {
  assert.equal(renderMarkdown('Plain *italic* and **bold**\nNext\\nLast'), 'Plain <em>italic</em> and <strong>bold</strong><br>Next<br>Last');
  assert.equal(renderMarkdown('***both***'), '<strong><em>both</em></strong>');
  assert.equal(renderMarkdown('**bold with *italic* inside**'), '<strong>bold with <em>italic</em> inside</strong>');
  assert.equal(renderMarkdown('Unmatched * stays'), 'Unmatched * stays');
});

test('source HTML stays inert while markdown is rendered', () => {
  assert.equal(renderMarkdown('<img src=x onerror=alert(1)> **A & B**'), '&lt;img src=x onerror=alert(1)&gt; <strong>A &amp; B</strong>');
});

test('rules render headings, paragraphs, lists, emphasis, and source links', () => {
  const html = renderRulesMarkdown('# Rules\r\n\r\nRead **carefully**.\nNext line.\n\n1. First\n2. Second\n\n- Item\n\n[Source](https://example.com/?a=1&b=2)');
  assert.match(html, /<h1>Rules<\/h1>/);
  assert.match(html, /<p>Read <strong>carefully<\/strong>\.<br>Next line\.<\/p>/);
  assert.match(html, /<ol>\n<li>First<\/li>\n<li>Second<\/li>\n<\/ol>/);
  assert.match(html, /<ul>\n<li>Item<\/li>\n<\/ul>/);
  assert.match(html, /href="https:\/\/example.com\/\?a=1&amp;b=2"/);
});

test('rules escape HTML and reject executable link protocols', () => {
  const html = renderRulesMarkdown('# <script>alert(1)</script>\n\n[Bad](javascript:alert) [Data](data:text/html,bad) [Quote](https://example.com/"onclick="bad)');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.match(html, /&quot;onclick=&quot;bad/);
});
