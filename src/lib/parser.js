/**
 * CoreNote Note & Task Parser
 */

/**
 * Parse tags (#tag) from text
 * @param {string} text 
 * @returns {string[]}
 */
export function extractTags(text) {
  const matches = text.match(/#[\w\/-]+/g);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
}

/**
 * Parse priority (!high, !medium, !low, !!high, !!medium, !!low) from text
 * @param {string} text 
 * @returns {'high' | 'medium' | 'low' | null}
 */
export function extractPriority(text) {
  if (/!{1,2}(\d+|high)\b/i.test(text)) {
    const m = text.match(/!{1,2}(\d+|high)\b/i);
    return m[1].toLowerCase() === '1' || m[1].toLowerCase() === 'high' ? 'high' : m[1];
  }
  if (/!{1,2}(\d+|medium)\b/i.test(text)) {
    const m = text.match(/!{1,2}(\d+|medium)\b/i);
    return m[1].toLowerCase() === '2' || m[1].toLowerCase() === 'medium' ? 'medium' : m[1];
  }
  if (/!{1,2}(\d+|low)\b/i.test(text)) {
    const m = text.match(/!{1,2}(\d+|low)\b/i);
    return m[1].toLowerCase() === '3' || m[1].toLowerCase() === 'low' ? 'low' : m[1];
  }
  return null;
}

/**
 * Parse note input into structured representation
 * @param {string} rawInput 
 */
export function parseNote(rawInput) {
  return {
    raw: rawInput,
    tags: extractTags(rawInput),
    priority: extractPriority(rawInput),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Parse a single todo line from markdown into an object
 * Example line: "- [ ] Buy groceries #shopping !!high @2026-08-10"
 * @param {string} line 
 * @returns {{ done: boolean, text: string, tags: string[], priority: string | null, dueDate: string | null, type: string }}
 */
export function parseTodoLine(line) {
  const todoRegex = /^\s*[-*]\s*\[([ xX])\]\s*(.*)$/;
  const match = line.match(todoRegex);
  
  if (!match) {
    return {
      done: false,
      text: line.trim(),
      tags: extractTags(line),
      priority: extractPriority(line),
      dueDate: null,
      type: 'checkbox',
    };
  }

  const done = match[1].toLowerCase() === 'x';
  let content = match[2];

  // Extract due date (@YYYY-MM-DD or @word)
  let dueDate = null;
  const dateMatch = content.match(/\s*@(\d{4}-\d{2}-\d{2}|\w+)\b/);
  if (dateMatch) {
    dueDate = dateMatch[1];
    content = content.replace(dateMatch[0], '');
  }

  // Extract priority (!!high, !!medium, !!low or !!1, !!2, !!3)
  let priority = null;
  const prioMatch = content.match(/\s*!{1,2}(\d+|high|medium|low)\b/i);
  if (prioMatch) {
    priority = prioMatch[1].toLowerCase();
    content = content.replace(prioMatch[0], '');
  }

  // Extract tags (#tag)
  const tags = extractTags(content);
  // Remove tags from text
  const textWithoutTags = content.replace(/\s*#[\w-]+/g, '').trim();

  return {
    done,
    text: textWithoutTags,
    tags,
    priority,
    dueDate,
    type: 'checkbox',
  };
}

/**
 * Build a markdown todo line string from an object
 * @param {{ done: boolean, text: string, tags?: string[], priority?: string | null, dueDate?: string | null }} todo 
 * @returns {string}
 */
export function buildTodoLine({ done = false, text = '', tags = [], priority = null, dueDate = null }) {
  const checkbox = done ? '[x]' : '[ ]';
  const parts = [`- ${checkbox} ${text.trim()}`];

  if (tags && tags.length > 0) {
    // Only append tag if not already in text
    const newTags = tags.filter((tag) => !text.includes(`#${tag}`));
    if (newTags.length > 0) {
      parts.push(newTags.map((t) => `#${t}`).join(' '));
    }
  }

  if (priority && !text.includes(`!!${priority}`) && !text.includes(`!${priority}`)) {
    parts.push(`!!${priority}`);
  }

  if (dueDate && !text.includes(`@${dueDate}`)) {
    parts.push(`@${dueDate}`);
  }

  return parts.join(' ');
}

/**
 * Parse markdown document into sections object
 * @param {string} rawText 
 * @returns {Record<string, Array<any>>}
 */
export function parseMarkdownToSections(rawText) {
  const sections = {};
  if (!rawText) return sections;

  const lines = rawText.split(/\r?\n/);
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for H1 (# YYYY-MM-DD)
    if (trimmed.startsWith('# ')) {
      continue;
    }

    // Check for H2 (## SectionName)
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace(/^##\s+/, '').trim();
      if (!sections[currentSection]) {
        sections[currentSection] = [];
      }
      continue;
    }

    // Skip empty lines when processing
    if (!trimmed) {
      continue;
    }

    if (currentSection) {
      if (currentSection.toLowerCase() === 'todos' && /^\s*[-*]\s*\[[ xX]\]/.test(trimmed)) {
        sections[currentSection].push(parseTodoLine(trimmed));
      } else {
        sections[currentSection].push(trimmed);
      }
    }
  }

  return sections;
}

/**
 * Convert sections object back to raw markdown string
 * @param {string} dateString 
 * @param {Record<string, Array<any>>} sectionsObject 
 * @returns {string}
 */
export function sectionsToMarkdown(dateString, sectionsObject = {}) {
  const lines = [`# ${dateString}`, ''];

  for (const [sectionTitle, items] of Object.entries(sectionsObject)) {
    lines.push(`## ${sectionTitle}`);
    if (Array.isArray(items)) {
      for (const item of items) {
        if (typeof item === 'string') {
          lines.push(item);
        } else if (item && typeof item === 'object') {
          if (item.type === 'paragraph') {
            lines.push(item.text);
          } else if (item.type === 'bullet') {
            lines.push(item.text.startsWith('- ') ? item.text : `- ${item.text}`);
          } else {
            lines.push(buildTodoLine(item));
          }
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Merge two section objects, deduplicating identical items by exact text and metadata
 * @param {Record<string, Array<any>>} sectionsOurs 
 * @param {Record<string, Array<any>>} sectionsTheirs 
 * @returns {Record<string, Array<any>>}
 */
export function mergeSections(sectionsOurs = {}, sectionsTheirs = {}) {
  const merged = {};
  const allSectionNames = new Set([
    ...Object.keys(sectionsOurs || {}),
    ...Object.keys(sectionsTheirs || {}),
  ]);

  for (const sectionName of allSectionNames) {
    const itemsOurs = (sectionsOurs && sectionsOurs[sectionName]) || [];
    const itemsTheirs = (sectionsTheirs && sectionsTheirs[sectionName]) || [];

    const mergedItems = [];
    const seenSignatures = new Set();

    function getItemSignature(item) {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const done = item.done ? 'x' : ' ';
        const text = (item.text || '').trim();
        const tags = (item.tags || []).slice().sort().join(',');
        const priority = item.priority || '';
        const dueDate = item.dueDate || '';
        const type = item.type || 'checkbox';
        return `${type}|${done}|${text}|${tags}|${priority}|${dueDate}`;
      }
      return String(item).trim();
    }

    for (const item of itemsOurs) {
      const sig = getItemSignature(item);
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        mergedItems.push(item);
      }
    }

    for (const item of itemsTheirs) {
      const sig = getItemSignature(item);
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        mergedItems.push(item);
      }
    }

    merged[sectionName] = mergedItems;
  }

  return merged;
}

export default {
  extractTags,
  extractPriority,
  parseNote,
  parseTodoLine,
  buildTodoLine,
  parseMarkdownToSections,
  sectionsToMarkdown,
  mergeSections,
};
