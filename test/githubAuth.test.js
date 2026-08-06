import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import keyring from '../src/lib/keyring.js';
import { GITHUB_CLIENT_ID } from '../src/lib/githubAuth.js';

describe('GitHub OAuth & Keyring Unit Tests', () => {

  test('GITHUB_CLIENT_ID placeholder or env is exported', () => {
    assert.ok(typeof GITHUB_CLIENT_ID === 'string');
    assert.ok(GITHUB_CLIENT_ID.length > 0);
  });

  test('keyring saveToken, getToken, and deleteToken round-trip correctly', async () => {
    const testToken = 'gho_dummy_token_123456789';

    await keyring.saveToken(testToken);
    const retrieved = await keyring.getToken();
    assert.equal(retrieved, testToken);

    await keyring.deleteToken();
    const afterDelete = await keyring.getToken();
    assert.ok(afterDelete !== testToken);
  });

});
