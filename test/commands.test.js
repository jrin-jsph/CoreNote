import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  writeDayFile,
  readDayFile,
  restoreUndoSnapshot,
  getFilePath,
} from '../src/lib/storage.js';

describe('Commands & Storage Integration Tests', () => {

  const testDate = '2029-12-31';

  beforeEach(() => {
    // Write initial test document
    const initialSections = {
      Todos: [
        { done: false, text: 'First task', tags: ['dev'], priority: '1', dueDate: '2029-12-31' },
        { done: false, text: 'Second task', tags: ['test'], priority: '2', dueDate: null },
      ],
      Notes: ['Initial test note'],
      Ideas: ['- Initial idea'],
    };
    writeDayFile(testDate, initialSections, 'initial');
  });

  afterEach(() => {
    // Clean up test date file
    const filePath = getFilePath(testDate);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  test('Done command updates item to [x]', () => {
    const sections = readDayFile(testDate);
    assert.equal(sections.Todos[0].done, false);

    sections.Todos[0].done = true;
    writeDayFile(testDate, sections, 'done');

    const updated = readDayFile(testDate);
    assert.equal(updated.Todos[0].done, true);
  });

  test('Edit command updates item text and re-parses metadata', () => {
    const sections = readDayFile(testDate);
    sections.Todos[0] = {
      done: false,
      text: 'Updated first task',
      tags: ['prod'],
      priority: 'high',
      dueDate: '2030-01-01',
    };
    writeDayFile(testDate, sections, 'edit');

    const updated = readDayFile(testDate);
    assert.equal(updated.Todos[0].text, 'Updated first task');
    assert.deepEqual(updated.Todos[0].tags, ['prod']);
    assert.equal(updated.Todos[0].priority, 'high');
  });

  test('Undo command reverts previous write action', () => {
    const beforeEdit = readDayFile(testDate);
    assert.equal(beforeEdit.Todos[0].text, 'First task');

    // Mutate and save
    const mutated = JSON.parse(JSON.stringify(beforeEdit));
    mutated.Todos[0].text = 'Mutated task text';
    writeDayFile(testDate, mutated, 'edit');

    const afterEdit = readDayFile(testDate);
    assert.equal(afterEdit.Todos[0].text, 'Mutated task text');

    // Perform undo
    restoreUndoSnapshot();

    const afterUndo = readDayFile(testDate);
    assert.equal(afterUndo.Todos[0].text, 'First task');
  });

});
