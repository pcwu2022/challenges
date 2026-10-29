// Escape source text before adding the small set of supported formatting tags.
export function renderMarkdown(text) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function inline(source) {
    return source.replace(/\*\*\*([^*]+)\*\*\*|\*\*([\s\S]+?)\*\*|\*([^*]+)\*/g, (match, both, bold, italic) => {
      if (both !== undefined) return `<strong><em>${both}</em></strong>`;
      if (bold !== undefined) return `<strong>${inline(bold)}</strong>`;
      return `<em>${italic}</em>`;
    });
  }
  return inline(escaped).replace(/\r\n|\r|\n|\\n/g, '<br>');
}

function renderLinks(text) {
  let html = '', offset = 0;
  for (const match of text.matchAll(/\[([^\]\n]+)\]\(([^\s)]+)\)/g)) {
    html += renderMarkdown(text.slice(offset, match.index));
    let safe = false;
    try { safe = ['https:', 'http:'].includes(new URL(match[2]).protocol); } catch {}
    if (safe) {
      const href = match[2].replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += `<a href="${href}" target="_blank" rel="noreferrer">${renderMarkdown(match[1])}</a>`;
    } else html += renderMarkdown(match[0]);
    offset = match.index + match[0].length;
  }
  return html + renderMarkdown(text.slice(offset));
}

// Rules support headings, paragraphs, flat lists, links, and inline emphasis.
export function renderRulesMarkdown(text) {
  const blocks = [];
  let paragraph = [], list = null;
  function flush() {
    if (paragraph.length) blocks.push(`<p>${renderLinks(paragraph.join('\n'))}</p>`);
    paragraph = [];
    if (list) blocks.push(`</${list}>`);
    list = null;
  }
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const item = /^(?:[-*]\s+|\d+\.\s+)(.+)$/.exec(line);
    if (!line.trim()) flush();
    else if (heading) {
      flush();
      blocks.push(`<h${heading[1].length}>${renderLinks(heading[2])}</h${heading[1].length}>`);
    } else if (item) {
      const type = /^\d/.test(line) ? 'ol' : 'ul';
      if (list !== type) { flush(); blocks.push(`<${type}>`); list = type; }
      blocks.push(`<li>${renderLinks(item[1])}</li>`);
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks.join('\n');
}
