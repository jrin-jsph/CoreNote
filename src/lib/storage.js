import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseMarkdownToSections, sectionsToMarkdown } from './parser.js';

const LAST_ACTION_PATH = path.join(os.homedir(), '.corenote', 'lastaction.json');

/**
 * Get current date string formatted as YYYY-MM-DD
 * @returns {string}
 */
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get full file path for a specific date's markdown file (~/.corenote/todos/YYYY-MM-DD.md)
 * @param {string} [dateString] 
 * @returns {string}
 */
export function getFilePath(dateString = getTodayDateString()) {
  const todosDir = path.join(os.homedir(), '.corenote', 'todos');
  return path.join(todosDir, `${dateString}.md`);
}

/**
 * Get today's markdown file path
 * @returns {string}
 */
export function getTodayFilePath() {
  return getFilePath(getTodayDateString());
}

/**
 * Ensure directory and date markdown file exist. Creates with default headers if missing.
 * @param {string} [dateString] 
 * @returns {string} Absolute file path
 */
export function ensureFileExists(dateString = getTodayDateString()) {
  const filePath = getFilePath(dateString);
  const dirPath = path.dirname(filePath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const initialContent = `# ${dateString}\n\n## Todos\n\n## Notes\n\n## Ideas\n`;
    fs.writeFileSync(filePath, initialContent, 'utf-8');
  }

  return filePath;
}

/**
 * Read and parse day file into sections object
 * @param {string} [dateString] 
 * @returns {Record<string, Array<any>>}
 */
export function readDayFile(dateString = getTodayDateString()) {
  const filePath = getFilePath(dateString);
  if (!fs.existsSync(filePath)) {
    ensureFileExists(dateString);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseMarkdownToSections(content);
}

/**
 * Save snapshot of file content before a write action for undo support
 * @param {string} dateString 
 * @param {string} actionName 
 */
export function saveUndoSnapshot(dateString = getTodayDateString(), actionName = 'write') {
  try {
    const filePath = getFilePath(dateString);
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : `# ${dateString}\n\n## Todos\n\n## Notes\n\n## Ideas\n`;
    const snapshot = {
      dateString,
      filePath,
      content,
      actionName,
      timestamp: new Date().toISOString(),
    };
    const dir = path.dirname(LAST_ACTION_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LAST_ACTION_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (err) {
    // Non-blocking snapshot error ignore
  }
}

/**
 * Restore file content from lastaction.json
 * @returns {Record<string, any> | null} Restored snapshot or null
 */
export function restoreUndoSnapshot() {
  if (!fs.existsSync(LAST_ACTION_PATH)) {
    return null;
  }
  try {
    const snapshot = JSON.parse(fs.readFileSync(LAST_ACTION_PATH, 'utf-8'));
    if (snapshot && snapshot.filePath && snapshot.content !== undefined) {
      const dirPath = path.dirname(snapshot.filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(snapshot.filePath, snapshot.content, 'utf-8');
      fs.unlinkSync(LAST_ACTION_PATH);
      return snapshot;
    }
  } catch (err) {
    return null;
  }
  return null;
}

/**
 * List all available date strings in ~/.corenote/todos/
 * @returns {string[]} Sorted array of date strings (e.g. ['2026-08-05', '2026-08-06'])
 */
export function listAllDayFiles() {
  const todosDir = path.join(os.homedir(), '.corenote', 'todos');
  if (!fs.existsSync(todosDir)) {
    return [];
  }
  const files = fs.readdirSync(todosDir);
  return files
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}

/**
 * Serialize sections object and write to day markdown file (with automatic undo snapshotting)
 * @param {string} [dateString] 
 * @param {Record<string, Array<any>>} [sectionsObject] 
 * @param {string} [actionName] 
 * @returns {string} Absolute file path
 */
export function writeDayFile(dateString = getTodayDateString(), sectionsObject = {}, actionName = 'write') {
  saveUndoSnapshot(dateString, actionName);

  const filePath = getFilePath(dateString);
  const dirPath = path.dirname(filePath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const markdownContent = sectionsToMarkdown(dateString, sectionsObject);
  fs.writeFileSync(filePath, markdownContent, 'utf-8');
  return filePath;
}

export default {
  getTodayDateString,
  getFilePath,
  getTodayFilePath,
  ensureFileExists,
  readDayFile,
  writeDayFile,
  saveUndoSnapshot,
  restoreUndoSnapshot,
  listAllDayFiles,
};
