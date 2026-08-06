import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { readDayFile, writeDayFile, getTodayDateString, ensureFileExists } from '../lib/storage.js';
import { parseEntry } from '../lib/entryParser.js';
import { parseTodoLine } from '../lib/parser.js';
import { pull, push, isGitRepo } from '../lib/git.js';

const h = React.createElement;

export function App() {
  const { exit } = useApp();
  const dateStr = getTodayDateString();

  const [todos, setTodos] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState('normal'); // 'normal' | 'adding' | 'selecting_type' | 'editing' | 'deleting'
  const [inputText, setInputText] = useState('');
  const [tempInput, setTempInput] = useState('');
  const [typeIndex, setTypeIndex] = useState(0);
  const [syncStatus, setSyncStatus] = useState('synced ✔');

  // Load data & initial sync
  useEffect(() => {
    ensureFileExists(dateStr);
    const sections = readDayFile(dateStr);
    setTodos(sections.Todos || []);

    if (isGitRepo()) {
      setSyncStatus('syncing...');
      setTimeout(() => {
        const res = pull();
        if (res.success) {
          setSyncStatus('synced ✔');
          const refreshed = readDayFile(dateStr);
          setTodos(refreshed.Todos || []);
        } else {
          setSyncStatus('⚠ offline');
        }
      }, 50);
    }
  }, []);

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

    if (trimmed.startsWith(':') || trimmed.startsWith('-') || /^[a-zA-Z ]+:\s*/.test(trimmed)) {
      const entry = parseEntry(trimmed);
      const sections = readDayFile(dateStr);
      if (!sections[entry.section]) sections[entry.section] = [];
      sections[entry.section].push(entry);
      writeDayFile(dateStr, sections, `add: ${entry.text}`);
      setTodos(sections.Todos || []);
      setMode('normal');
      if (isGitRepo()) {
        push(`add: ${entry.text}`);
      }
    } else {
      setTempInput(trimmed);
      setMode('selecting_type');
      setTypeIndex(0);
    }
  };

  const handleTypeSelect = (idx) => {
    let formatted = tempInput;
    if (idx === 1) formatted = `: ${tempInput}`;
    if (idx === 2) formatted = `- ${tempInput}`;

    const entry = parseEntry(formatted);
    const sections = readDayFile(dateStr);
    if (!sections[entry.section]) sections[entry.section] = [];
    sections[entry.section].push(entry);
    writeDayFile(dateStr, sections, `add: ${entry.text}`);
    setTodos(sections.Todos || []);
    setMode('normal');
    if (isGitRepo()) {
      push(`add: ${entry.text}`);
    }
  };

  const handleEditSubmit = (val) => {
    const trimmed = (val || '').trim();
    if (trimmed && todos[selectedIndex]) {
      const current = todos[selectedIndex];
      const check = current.done ? '[x]' : '[ ]';
      const updated = parseTodoLine(`- ${check} ${trimmed}`);
      const newTodos = [...todos];
      newTodos[selectedIndex] = updated;
      saveAndPush(newTodos, `edit: ${updated.text}`);
    }
    setMode('normal');
  };

  useInput((input, key) => {
    if (mode === 'normal') {
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(todos.length - 1, prev + 1));
      } else if (input === ' ' || key.return) {
        if (todos.length > 0 && todos[selectedIndex]) {
          const newTodos = [...todos];
          newTodos[selectedIndex] = {
            ...newTodos[selectedIndex],
            done: !newTodos[selectedIndex].done,
          };
          saveAndPush(newTodos, `done: toggle ${newTodos[selectedIndex].text}`);
        }
      } else if (input === 'a') {
        setMode('adding');
        setInputText('');
      } else if (input === 'e') {
        if (todos.length > 0 && todos[selectedIndex]) {
          setMode('editing');
          setInputText(todos[selectedIndex].text);
        }
      } else if (input === 'd') {
        if (todos.length > 0 && todos[selectedIndex]) {
          setMode('deleting');
        }
      } else if (input === 'q' || key.escape) {
        if (isGitRepo()) {
          push('exit TUI sync');
        }
        exit();
      }
    } else if (mode === 'selecting_type') {
      if (key.upArrow) {
        setTypeIndex((prev) => (prev > 0 ? prev - 1 : 2));
      } else if (key.downArrow) {
        setTypeIndex((prev) => (prev < 2 ? prev + 1 : 0));
      } else if (key.return) {
        handleTypeSelect(typeIndex);
      } else if (key.escape) {
        setMode('normal');
      }
    } else if (mode === 'deleting') {
      if (input === 'y' || input === 'Y') {
        const newTodos = todos.filter((_, idx) => idx !== selectedIndex);
        setSelectedIndex((prev) => Math.max(0, Math.min(prev, newTodos.length - 1)));
        saveAndPush(newTodos, 'delete: todo item');
        setMode('normal');
      } else if (input === 'n' || input === 'N' || key.escape) {
        setMode('normal');
      }
    }
  });

  const typeOptions = ['Todo (checkbox)', 'Note (paragraph)', 'Bullet item'];

  return h(
    Box,
    { flexDirection: 'column', padding: 1 },
    // Header
    h(
      Box,
      { justifyContent: 'space-between' },
      h(Text, { bold: true, color: 'cyan' }, `CoreNote CLI - Today (${dateStr})`),
      h(
        Text,
        { color: syncStatus.includes('✔') ? 'green' : syncStatus.includes('offline') ? 'yellow' : 'gray' },
        syncStatus
      )
    ),

    // Main Todos Border Box
    h(
      Box,
      { borderStyle: 'round', flexDirection: 'column', paddingX: 1, marginY: 1, minHeight: 6 },
      todos.length === 0 && mode === 'normal'
        ? h(Text, { color: 'gray', italic: true }, 'No todos for today. Press "a" to add one!')
        : todos.map((todo, idx) => {
            const isSelected = idx === selectedIndex && mode === 'normal';
            const checkmark = todo.done ? '[x]' : '[ ]';
            const prioStr = todo.priority ? ` !!${todo.priority}` : '';
            const tagsStr = (todo.tags || []).map((t) => ` #${t}`).join('');
            const dueStr = todo.dueDate ? ` @${todo.dueDate}` : '';

            return h(
              Box,
              { key: idx },
              h(Text, { color: isSelected ? 'cyan' : 'gray' }, isSelected ? '> ' : '  '),
              h(
                Text,
                {
                  inverse: isSelected,
                  color: todo.done ? 'green' : 'white',
                  strikethrough: todo.done,
                },
                `${checkmark} ${todo.text}${tagsStr}${prioStr}${dueStr}`
              )
            );
          }),

      // Add mode text input
      mode === 'adding' &&
        h(
          Box,
          { marginTop: 1 },
          h(Text, { color: 'cyan' }, 'Add Entry: '),
          h(TextInput, { value: inputText, onChange: setInputText, onSubmit: handleAddSubmit })
        ),

      // Type selector dropdown
      mode === 'selecting_type' &&
        h(
          Box,
          { flexDirection: 'column', marginTop: 1 },
          h(Text, { color: 'yellow', bold: true }, 'Select Entry Type:'),
          typeOptions.map((opt, i) =>
            h(
              Text,
              { key: i, color: i === typeIndex ? 'cyan' : 'gray', inverse: i === typeIndex },
              `${i === typeIndex ? '> ' : '  '}${opt}`
            )
          )
        ),

      // Edit mode text input
      mode === 'editing' &&
        h(
          Box,
          { marginTop: 1 },
          h(Text, { color: 'yellow' }, 'Edit Entry: '),
          h(TextInput, { value: inputText, onChange: setInputText, onSubmit: handleEditSubmit })
        ),

      // Delete confirmation
      mode === 'deleting' &&
        h(
          Box,
          { marginTop: 1 },
          h(
            Text,
            { color: 'red', bold: true },
            `Delete "${todos[selectedIndex]?.text}"? (y/n)`
          )
        )
    ),

    // Footer Hints
    h(
      Text,
      { color: 'gray' },
      '↑↓ navigate  space toggle  a add  e edit  d delete  q quit'
    )
  );
}

export function launchTUI() {
  render(h(App));
}

export default App;
