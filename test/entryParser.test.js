import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry } from '../src/lib/entryParser.js';

describe('Entry Parser Unit Tests', () => {

  test('Rule 1: Starts with ":" -> Notes section (paragraph)', () => {
    const input = ': meeting notes from sync';
    const result = parseEntry(input);

    assert.equal(result.section, 'Notes');
    assert.equal(result.type, 'paragraph');
    assert.equal(result.text, 'meeting notes from sync');
  });

  test('Rule 2: Starts with "-" -> Ideas section (bullet)', () => {
    const input = '- read article on web components';
    const result = parseEntry(input);

    assert.equal(result.section, 'Ideas');
    assert.equal(result.type, 'bullet');
    assert.equal(result.text, 'read article on web components');
  });

  test('Rule 3: Matches "Section: Text" -> Custom Section (bullet)', () => {
    const input = 'Bugs: memory leak in worker';
    const result = parseEntry(input);

    assert.equal(result.section, 'Bugs');
    assert.equal(result.type, 'bullet');
    assert.equal(result.text, 'memory leak in worker');
  });

  test('Rule 4: Otherwise -> Todos section with inline metadata extraction', () => {
    const input = 'fix ssl bug #backend !!2 @tomorrow';
    const result = parseEntry(input);

    assert.equal(result.section, 'Todos');
    assert.equal(result.type, 'checkbox');
    assert.equal(result.text, 'fix ssl bug');
    assert.deepEqual(result.tags, ['backend']);
    assert.equal(result.priority, '2');
    assert.equal(result.dueDate, 'tomorrow');
  });

  test('Metadata extraction with priority !!1 and @2026-08-10', () => {
    const input = 'deploy release #prod !!1 @2026-08-10';
    const result = parseEntry(input);

    assert.equal(result.section, 'Todos');
    assert.equal(result.text, 'deploy release');
    assert.deepEqual(result.tags, ['prod']);
    assert.equal(result.priority, '1');
    assert.equal(result.dueDate, '2026-08-10');
  });

});
