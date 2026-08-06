/**
 * Smart Entry Parser for CoreNote CLI
 */

/**
 * Capitalize section name (Title Case)
 * @param {string} str 
 * @returns {string}
 */
function capitalizeSection(str) {
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parse raw CLI input string into structured entry object
 * @param {string} rawInput 
 * @returns {{ section: string, type: 'paragraph' | 'bullet' | 'checkbox', text: string, tags: string[], priority: string | null, dueDate: string | null }}
 */
export function parseEntry(rawInput) {
  const input = (rawInput || '').trim();

  let section = 'Todos';
  let type = 'checkbox';
  let text = input;

  // Rule 1: Starts with ":" -> Notes (paragraph)
  if (input.startsWith(':')) {
    section = 'Notes';
    type = 'paragraph';
    text = input.slice(1).trim();
  }
  // Rule 2: Starts with "-" -> Ideas (bullet)
  else if (input.startsWith('-')) {
    section = 'Ideas';
    type = 'bullet';
    text = input.replace(/^-\s*/, '').trim();
  }
  // Rule 3: Matches "Section: Text" -> Custom Section (bullet)
  else {
    const colonMatch = input.match(/^([a-zA-Z ]+):\s*(.+)$/);
    if (colonMatch) {
      section = capitalizeSection(colonMatch[1].trim());
      type = 'bullet';
      text = colonMatch[2].trim();
    }
  }

  // Extract inline metadata (#tag, !!N / !!priority, @date / @word)
  let dueDate = null;
  const dateMatch = text.match(/\s*@(\d{4}-\d{2}-\d{2}|\w+)\b/);
  if (dateMatch) {
    dueDate = dateMatch[1];
    text = text.replace(dateMatch[0], '');
  }

  let priority = null;
  const prioMatch = text.match(/\s*!{1,2}(\d+|high|medium|low)\b/i);
  if (prioMatch) {
    priority = prioMatch[1];
    text = text.replace(prioMatch[0], '');
  }

  const tags = [];
  const tagMatches = text.match(/#[\w-]+/g);
  if (tagMatches) {
    tagMatches.forEach((t) => tags.push(t.slice(1)));
    text = text.replace(/\s*#[\w-]+/g, '');
  }

  return {
    section,
    type,
    text: text.trim(),
    tags,
    priority,
    dueDate,
  };
}

export default {
  parseEntry,
};
