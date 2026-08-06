import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTodoLine,
  buildTodoLine,
  parseMarkdownToSections,
  sectionsToMarkdown,
  extractTags,
  extractPriority,
} from '../src/lib/parser.js';

describe('Parser Unit Tests', () => {

  describe('parseTodoLine and buildTodoLine', () => {

    test('should parse unchecked todo line with tag, priority, and date', () => {
      const line = '- [ ] Buy groceries #shopping !!high @2026-08-10';
      const parsed = parseTodoLine(line);

      assert.deepEqual(parsed, {
        done: false,
        text: 'Buy groceries',
        tags: ['shopping'],
        priority: 'high',
        dueDate: '2026-08-10',
        project: null,
        branch: null,
        type: 'checkbox',
      });
    });

    test('should parse checked todo line', () => {
      const line = '- [x] completed text';
      const parsed = parseTodoLine(line);

      assert.deepEqual(parsed, {
        done: true,
        text: 'completed text',
        tags: [],
        priority: null,
        dueDate: null,
        project: null,
        branch: null,
        type: 'checkbox',
      });
    });

    test('should round-trip parseTodoLine -> buildTodoLine for unchecked todo', () => {
      const original = '- [ ] Buy groceries #shopping !!high @2026-08-10';
      const parsed = parseTodoLine(original);
      const rebuilt = buildTodoLine(parsed);

      assert.equal(rebuilt, original);
    });

    test('should round-trip parseTodoLine -> buildTodoLine for checked todo', () => {
      const original = '- [x] completed text';
      const parsed = parseTodoLine(original);
      const rebuilt = buildTodoLine(parsed);

      assert.equal(rebuilt, original);
    });

    test('should round-trip parseTodoLine -> buildTodoLine with custom priority and date', () => {
      const original = '- [ ] Finish report #work !!medium @2026-08-15';
      const parsed = parseTodoLine(original);
      const rebuilt = buildTodoLine(parsed);

      assert.equal(rebuilt, original);
    });

  });

  describe('parseMarkdownToSections and sectionsToMarkdown', () => {

    test('should parse full markdown document to sections object correctly', () => {
      const rawText = `# 2026-08-06

## Todos
- [ ] text #tag !!high @2026-08-06
- [x] completed text

## Notes
plain paragraph text

## Ideas
- bullet text`;

      const dateString = '2026-08-06';
      const sections = parseMarkdownToSections(rawText);

      assert.ok(sections.Todos);
      assert.equal(sections.Todos.length, 2);
      assert.equal(sections.Todos[0].text, 'text');
      assert.equal(sections.Todos[0].priority, 'high');
      assert.equal(sections.Todos[0].dueDate, '2026-08-06');
      assert.deepEqual(sections.Todos[0].tags, ['tag']);
      assert.equal(sections.Todos[1].done, true);
      assert.equal(sections.Todos[1].text, 'completed text');

      assert.deepEqual(sections.Notes, ['plain paragraph text']);
      assert.deepEqual(sections.Ideas, ['- bullet text']);
    });

    test('should round-trip parse -> rebuild document matching original markdown', () => {
      const originalMarkdown = `# 2026-08-06

## Todos
- [ ] text #tag !!high @2026-08-06
- [x] completed text

## Notes
plain paragraph text

## Ideas
- bullet text`;

      const dateString = '2026-08-06';
      const sections = parseMarkdownToSections(originalMarkdown);
      const rebuiltMarkdown = sectionsToMarkdown(dateString, sections);

      assert.equal(rebuiltMarkdown, originalMarkdown);
    });

  });

  describe('Helper Functions', () => {
    test('extractTags should extract tags from string', () => {
      assert.deepEqual(extractTags('Fix bug #urgent #dev-task'), ['urgent', 'dev-task']);
      assert.deepEqual(extractTags('No tags here'), []);
    });

    test('extractPriority should extract priority from string', () => {
      assert.equal(extractPriority('Task !!high'), 'high');
      assert.equal(extractPriority('Task !medium'), 'medium');
      assert.equal(extractPriority('Task !!low'), 'low');
      assert.equal(extractPriority('Task no priority'), null);
    });
  });

});
