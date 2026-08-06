import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getCwdGitContext } from '../src/lib/gitContext.js';
import { parseTodoLine, buildTodoLine } from '../src/lib/parser.js';

describe('Git Context & Metadata Unit Tests', () => {

  test('getCwdGitContext detects current repository context', () => {
    const ctx = getCwdGitContext();
    assert.ok(ctx !== null);
    assert.equal(typeof ctx.repoName, 'string');
    assert.equal(typeof ctx.branch, 'string');
    assert.ok(ctx.repoName.length > 0);
  });

  test('parseTodoLine and buildTodoLine round-trip with project and branch metadata', () => {
    const line = '- [ ] Refactor API project:CoreNote branch:main #backend !!high @2026-08-10';
    const parsed = parseTodoLine(line);

    assert.equal(parsed.project, 'CoreNote');
    assert.equal(parsed.branch, 'main');
    assert.equal(parsed.text, 'Refactor API');
    assert.deepEqual(parsed.tags, ['backend']);

    const rebuilt = buildTodoLine(parsed);
    assert.ok(rebuilt.includes('project:CoreNote'));
    assert.ok(rebuilt.includes('branch:main'));
  });

});
