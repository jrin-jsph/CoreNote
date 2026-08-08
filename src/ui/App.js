import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { readDayFile, writeDayFile, getTodayDateString, ensureFileExists } from '../lib/storage.js';
import { parseEntry } from '../lib/entryParser.js';
import { parseTodoLine } from '../lib/parser.js';
import { pull, push, isGitRepo } from '../lib/git.js';

const h = React.createElement;

// Default sample todos matching user interface layout if day file is empty
const SAMPLE_TODOS = [
  { done: false, text: 'Fix SSL certificate auto-renewal cron', tags: ['backend'], priority: '1', timeAgo: '10m ago' },
  { done: true, text: 'Refactor OAuth2 refresh token rotation handler', tags: ['auth'], priority: '1', timeAgo: '1h ago' },
  { done: false, text: 'Benchmark PostgreSQL connection pool under 5k RPS', tags: ['infra'], priority: '2', timeAgo: '3h ago' },
  { done: true, text: 'Add copy-to-clipboard feedback to CodeBlock component', tags: ['ui'], priority: '3', timeAgo: '5h ago' },
  { done: false, text: 'Update CLI docs for cnte init auth flags', tags: ['docs'], priority: '2', timeAgo: '1d ago' },
  { done: false, text: 'Implement fuzzy search in TUI mode (press / to filter)', tags: ['tui'], priority: '2', timeAgo: '2d ago' },
];

export function App() {
  const { exit } = useApp();
  const dateStr = getTodayDateString();

  const [todos, setTodos] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedTagIndex, setSelectedTagIndex] = useState(0);
  const [mode, setMode] = useState('normal'); // 'normal' | 'adding' | 'editing' | 'deleting'
  const [inputText, setInputText] = useState('');
  const [syncStatus, setSyncStatus] = useState('synced ✔');

  // Load data & initial sync
  useEffect(() => {
    ensureFileExists(dateStr);
    const sections = readDayFile(dateStr);
    let currentTodos = sections.Todos || [];
    if (currentTodos.length === 0) {
      currentTodos = SAMPLE_TODOS.map((item) => ({
        ...item,
        type: 'checkbox',
        dueDate: null,
        project: null,
        branch: null,
      }));
      sections.Todos = currentTodos;
      writeDayFile(dateStr, sections, 'init sample');
    }
    setTodos(currentTodos);

    if (isGitRepo()) {
      setSyncStatus('syncing...');
      setTimeout(() => {
        const res = pull();
        if (res.success) {
          setSyncStatus('synced ✔');
          const refreshed = readDayFile(dateStr);
          if (refreshed.Todos && refreshed.Todos.length > 0) {
            setTodos(refreshed.Todos);
          }
        } else {
          setSyncStatus('⚠ offline');
        }
      }, 50);
    }
  }, []);

  // Compute dynamic tags list from current todos
  const availableTags = ['ALL'];
  todos.forEach((t) => {
    (t.tags || []).forEach((tag) => {
      const formatted = tag.startsWith('#') ? tag : `#${tag}`;
      if (!availableTags.includes(formatted)) {
        availableTags.push(formatted);
      }
    });
  });

  const activeTag = availableTags[selectedTagIndex] || 'ALL';

  // Filter todos by selected tag
  const filteredTodos = todos.filter((todo) => {
    if (activeTag === 'ALL') return true;
    const cleanTag = activeTag.replace(/^#/, '');
    return (todo.tags || []).some((t) => t.replace(/^#/, '') === cleanTag);
  });

  const pendingCount = todos.filter((t) => !t.done).length;
  const totalCount = todos.length;

  const saveAndPush = (newTodos, actionMsg) => {
    const sections = readDayFile(dateStr);
    sections.Todos = newTodos;
    writeDayFile(dateStr, sections, actionMsg);
    setTodos(newTodos);

    if (isGitRepo()) {
      setSyncStatus('syncing...');
      setTimeout(() => {
        const res = push(actionMsg);
        setSyncStatus(res.success ? 'synced ✔' : '⚠ offline');
      }, 50);
    }
  };

  const handleAddSubmit = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      setMode('normal');
      return;
    }

    const entry = parseTodoLine(trimmed.startsWith('-') ? trimmed : `- [ ] ${trimmed}`);
    const newTodos = [...todos, entry];
    saveAndPush(newTodos, `add: ${entry.text}`);
    setMode('normal');
    setInputText('');
  };

  const handleEditSubmit = (val) => {
    const trimmed = (val || '').trim();
    const targetTodo = filteredTodos[selectedIndex];
    if (trimmed && targetTodo) {
      const realIndex = todos.indexOf(targetTodo);
      if (realIndex !== -1) {
        const check = targetTodo.done ? '[x]' : '[ ]';
        const updated = parseTodoLine(`- ${check} ${trimmed}`);
        const newTodos = [...todos];
        newTodos[realIndex] = updated;
        saveAndPush(newTodos, `edit: ${updated.text}`);
      }
    }
    setMode('normal');
    setInputText('');
  };

  useInput((input, key) => {
    if (mode === 'normal') {
      // Navigation: Down / j
      if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => Math.min(filteredTodos.length - 1, prev + 1));
      }
      // Navigation: Up / k
      else if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      }
      // Tag Filter Navigation: Left / h
      else if (key.leftArrow || input === 'h') {
        setSelectedTagIndex((prev) => (prev > 0 ? prev - 1 : availableTags.length - 1));
        setSelectedIndex(0);
      }
      // Tag Filter Navigation: Right / l
      else if (key.rightArrow || input === 'l') {
        setSelectedTagIndex((prev) => (prev < availableTags.length - 1 ? prev + 1 : 0));
        setSelectedIndex(0);
      }
      // Toggle Done: Space / Return / x
      else if (input === ' ' || key.return || input === 'x') {
        const targetTodo = filteredTodos[selectedIndex];
        if (targetTodo) {
          const realIndex = todos.indexOf(targetTodo);
          if (realIndex !== -1) {
            const newTodos = [...todos];
            newTodos[realIndex] = {
              ...newTodos[realIndex],
              done: !newTodos[realIndex].done,
            };
            saveAndPush(newTodos, `done: toggle ${newTodos[realIndex].text}`);
          }
        }
      }
      // Add: n / a
      else if (input === 'n' || input === 'a') {
        setMode('adding');
        setInputText('');
      }
      // Edit: e
      else if (input === 'e') {
        const targetTodo = filteredTodos[selectedIndex];
        if (targetTodo) {
          setMode('editing');
          setInputText(targetTodo.text);
        }
      }
      // Delete: d
      else if (input === 'd') {
        const targetTodo = filteredTodos[selectedIndex];
        if (targetTodo) {
          setMode('deleting');
        }
      }
      // Quit: q / Esc
      else if (input === 'q' || key.escape) {
        if (isGitRepo()) {
          push('exit TUI sync');
        }
        exit();
      }
    } else if (mode === 'deleting') {
      if (input === 'y' || input === 'Y') {
        const targetTodo = filteredTodos[selectedIndex];
        if (targetTodo) {
          const realIndex = todos.indexOf(targetTodo);
          if (realIndex !== -1) {
            const newTodos = todos.filter((_, idx) => idx !== realIndex);
            setSelectedIndex((prev) => Math.max(0, Math.min(prev, newTodos.length - 1)));
            saveAndPush(newTodos, 'delete: todo item');
          }
        }
        setMode('normal');
      } else if (input === 'n' || input === 'N' || key.escape) {
        setMode('normal');
      }
    } else if (mode === 'adding' || mode === 'editing') {
      if (key.escape) {
        setMode('normal');
        setInputText('');
      }
    }
  });

  return h(
    Box,
    { flexDirection: 'column', paddingX: 1, paddingY: 1 },

    // 1. TOP BAR: Tag Filters & Stats Counter
    h(
      Box,
      { justifyContent: 'space-between', marginBottom: 1 },
      h(
        Box,
        null,
        h(Text, { color: 'gray', bold: true }, 'Tag Filter:  '),
        availableTags.map((tag, idx) => {
          const isSelected = idx === selectedTagIndex;
          return h(
            Box,
            { key: tag, marginRight: 1 },
            isSelected
              ? h(Text, { color: 'black', backgroundColor: 'green', bold: true }, ` ${tag} `)
              : h(Text, { color: 'green' }, tag)
          );
        })
      ),
      h(
        Box,
        null,
        h(Text, { color: 'green', bold: true }, `${pendingCount} pending`),
        h(Text, { color: 'gray' }, ` / ${totalCount} total`)
      )
    ),

    // 2. MAIN TASK LIST
    h(
      Box,
      { flexDirection: 'column', marginY: 0 },
      filteredTodos.length === 0
        ? h(
            Box,
            { borderStyle: 'single', borderColor: 'gray', padding: 1 },
            h(Text, { color: 'gray', italic: true }, 'No todos match the filter. Press "N" to add one!')
          )
        : filteredTodos.map((todo, idx) => {
            const isSelected = idx === selectedIndex && mode === 'normal';

            // Extract tags for display
            const tagsStr = (todo.tags || [])
              .map((t) => (t.startsWith('#') ? t : `#${t}`))
              .join(' ');
            const fullText = tagsStr ? `${todo.text} ${tagsStr}` : todo.text;

            // Priority badge styling
            const prio = String(todo.priority || '');
            let prioLabel = null;
            let prioColor = 'gray';

            if (prio === '1' || prio === 'high') {
              prioLabel = 'P1';
              prioColor = 'red';
            } else if (prio === '2' || prio === 'medium') {
              prioLabel = 'P2';
              prioColor = 'yellow';
            } else if (prio === '3' || prio === 'low') {
              prioLabel = 'P3';
              prioColor = 'blue';
            }

            const timeAgo = todo.timeAgo || `${(idx + 1) * 10}m ago`;

            const rowContent = h(
              Box,
              { justifyContent: 'space-between', width: '100%' },
              // Left: Arrow, Checkbox, Text
              h(
                Box,
                null,
                h(Text, { color: 'green', bold: true }, isSelected ? '> ' : '  '),
                h(
                  Text,
                  { color: todo.done ? 'green' : 'gray', bold: true },
                  todo.done ? '☑ ' : '☐ '
                ),
                h(
                  Text,
                  {
                    color: todo.done ? 'gray' : 'white',
                    strikethrough: todo.done,
                  },
                  fullText
                )
              ),
              // Right: Priority badge & Timestamp
              h(
                Box,
                { gap: 1 },
                prioLabel &&
                  h(
                    Box,
                    { borderStyle: 'single', borderColor: prioColor, paddingX: 0 },
                    h(Text, { color: prioColor, bold: true }, prioLabel)
                  ),
                h(Text, { color: 'gray' }, timeAgo)
              )
            );

            return isSelected
              ? h(
                  Box,
                  {
                    key: idx,
                    borderStyle: 'single',
                    borderColor: 'green',
                    paddingX: 0,
                    paddingY: 0,
                    marginY: 0,
                  },
                  rowContent
                )
              : h(Box, { key: idx, marginY: 0, paddingX: 1, paddingY: 0 }, rowContent);
          })
    ),

    // 3. INPUT MODES (Add / Edit / Delete)
    mode === 'adding' &&
      h(
        Box,
        { borderStyle: 'single', borderColor: 'cyan', paddingX: 1, marginY: 1 },
        h(Text, { color: 'cyan', bold: true }, 'Add Task: '),
        h(TextInput, { value: inputText, onChange: setInputText, onSubmit: handleAddSubmit })
      ),

    mode === 'editing' &&
      h(
        Box,
        { borderStyle: 'single', borderColor: 'yellow', paddingX: 1, marginY: 1 },
        h(Text, { color: 'yellow', bold: true }, 'Edit Task: '),
        h(TextInput, { value: inputText, onChange: setInputText, onSubmit: handleEditSubmit })
      ),

    mode === 'deleting' &&
      h(
        Box,
        { borderStyle: 'single', borderColor: 'red', paddingX: 1, marginY: 1 },
        h(
          Text,
          { color: 'red', bold: true },
          `Delete "${filteredTodos[selectedIndex]?.text}"? (y/n)`
        )
      ),

    // 4. BOTTOM KEYMAP NAVIGATION BAR
    h(
      Box,
      { justifyContent: 'space-between', marginTop: 1 },
      h(
        Box,
        { gap: 1 },
        h(Text, { inverse: true, bold: true }, ' ↑/↓ '),
        h(Text, { color: 'gray' }, 'Select'),

        h(Text, { inverse: true, bold: true }, ' Space '),
        h(Text, { color: 'gray' }, 'Toggle'),

        h(Text, { inverse: true, bold: true }, ' N '),
        h(Text, { color: 'gray' }, 'Add'),

        h(Text, { inverse: true, bold: true }, ' D '),
        h(Text, { color: 'gray' }, 'Delete'),

        h(Text, { inverse: true, bold: true }, ' Q '),
        h(Text, { color: 'gray' }, 'Quit')
      ),
      h(
        Box,
        null,
        h(Text, { color: 'green', bold: true }, '⌨ Vim motions enabled')
      )
    )
  );
}

export function launchTUI() {
  render(h(App));
}

export default App;
