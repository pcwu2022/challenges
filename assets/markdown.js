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
