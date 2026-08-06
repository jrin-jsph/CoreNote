import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSections } from '../src/lib/parser.js';
import { resolveConflictMarkers } from '../src/lib/git.js';

describe('Conflict Resolution Unit Tests', () => {

  test('resolveConflictMarkers extracts ours and theirs content correctly', () => {
    const rawContent = `# 2026-08-06

## Todos
<<<<<<< HEAD
- [ ] Task A #tag1 !!high
=======
- [ ] Task A #tag1 !!high
- [ ] Task B #tag2 !!medium
>>>>>>> 1234567

## Notes
Meeting notes`;

    const { oursText, theirsText } = resolveConflictMarkers(rawContent);

    assert.ok(oursText.includes('- [ ] Task A #tag1 !!high'));
    assert.ok(!oursText.includes('- [ ] Task B #tag2 !!medium'));

    assert.ok(theirsText.includes('- [ ] Task A #tag1 !!high'));
    assert.ok(theirsText.includes('- [ ] Task B #tag2 !!medium'));
    assert.ok(theirsText.includes('Meeting notes'));
  });

  test('mergeSections deduplicates items and merges unique items from both versions', () => {
    const sectionsOurs = {
      Todos: [
        { done: false, text: 'Task A', tags: ['tag1'], priority: 'high', dueDate: null },
        { done: false, text: 'Task B', tags: ['dev'], priority: 'low', dueDate: null },
      ],
      Notes: ['Note 1'],
    };

    const sectionsTheirs = {
      Todos: [
        { done: false, text: 'Task A', tags: ['tag1'], priority: 'high', dueDate: null },
        { done: false, text: 'Task C', tags: ['prod'], priority: 'medium', dueDate: null },
      ],
      Notes: ['Note 1', 'Note 2'],
    };

    const merged = mergeSections(sectionsOurs, sectionsTheirs);

    assert.equal(merged.Todos.length, 3);
    assert.equal(merged.Todos[0].text, 'Task A');
    assert.equal(merged.Todos[1].text, 'Task B');
    assert.equal(merged.Todos[2].text, 'Task C');

    assert.equal(merged.Notes.length, 2);
    assert.equal(merged.Notes[0], 'Note 1');
    assert.equal(merged.Notes[1], 'Note 2');
  });

});
