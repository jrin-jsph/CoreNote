import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isGitRepo, pull, push, initRepo, getNotesDir } from '../src/lib/git.js';

describe('Git Library Unit Tests', () => {

  test('getNotesDir should return valid path ending in .corenote', () => {
    const dirPath = getNotesDir();
    assert.ok(dirPath.endsWith('.corenote'));
  });

  test('pull() on non-git repository should return failure object instead of throwing exception', () => {
    const res = pull();
    assert.equal(typeof res.success, 'boolean');
    assert.ok('error' in res);
  });

  test('push() on non-git repository should return failure object instead of throwing exception', () => {
    const res = push('test commit');
    assert.equal(typeof res.success, 'boolean');
    assert.ok('error' in res);
  });

  test('initRepo should return success object when configuring remote', () => {
    const res = initRepo('https://github.com/example/notes.git');
    assert.equal(res.success, true);
    assert.equal(res.remoteUrl, 'https://github.com/example/notes.git');
    assert.equal(isGitRepo(), true);
  });

});
