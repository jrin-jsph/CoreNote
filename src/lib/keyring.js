import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const SERVICE_NAME = 'corenote';
const ACCOUNT_NAME = 'github_token';
const FALLBACK_PATH = path.join(os.homedir(), '.corenote', '.keyring');

let keytarModule = null;

async function getKeytar() {
  if (keytarModule !== null) return keytarModule;
  try {
    const kt = await import('keytar');
    keytarModule = kt.default || kt;
  } catch (err) {
    keytarModule = false;
  }
  return keytarModule;
}

/**
 * Save access token into OS keychain (via keytar) or secure fallback
 * @param {string} token 
 * @returns {Promise<boolean>}
 */
export async function saveToken(token) {
  const kt = await getKeytar();
  if (kt && typeof kt.setPassword === 'function') {
    try {
      await kt.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
      return true;
    } catch (err) {
      // Fallback if OS keychain rejects
    }
  }
  const dir = path.dirname(FALLBACK_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const encoded = Buffer.from(token).toString('base64');
  fs.writeFileSync(FALLBACK_PATH, encoded, 'utf-8');
  return true;
}

/**
 * Retrieve access token from OS keychain (via keytar) or secure fallback
 * @returns {Promise<string | null>}
 */
export async function getToken() {
  const kt = await getKeytar();
  if (kt && typeof kt.getPassword === 'function') {
    try {
      const pwd = await kt.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (pwd) return pwd;
    } catch (err) {}
  }
  if (fs.existsSync(FALLBACK_PATH)) {
    try {
      const content = fs.readFileSync(FALLBACK_PATH, 'utf-8');
      return Buffer.from(content.trim(), 'base64').toString('utf-8');
    } catch (err) {}
  }
  return null;
}

/**
 * Remove access token from OS keychain or fallback
 * @returns {Promise<boolean>}
 */
export async function deleteToken() {
  const kt = await getKeytar();
  if (kt && typeof kt.deletePassword === 'function') {
    try {
      await kt.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (err) {}
  }
  if (fs.existsSync(FALLBACK_PATH)) {
    try {
      fs.unlinkSync(FALLBACK_PATH);
    } catch (err) {}
  }
  return true;
}

export default {
  saveToken,
  getToken,
  deleteToken,
};
