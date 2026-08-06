import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_PATH = path.join(os.homedir(), '.corenoterc');

/**
 * Get the path to the configuration file.
 * @returns {string} Absolute path to ~/.corenoterc
 */
export function getConfigPath() {
  return CONFIG_PATH;
}

/**
 * Read and parse configuration from ~/.corenoterc.
 * @returns {Record<string, any>} Configuration object
 */
export function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return {};
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

/**
 * Write configuration object to ~/.corenoterc as formatted JSON.
 * @param {Record<string, any>} config 
 */
export function writeConfig(config) {
  try {
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_PATH, content, 'utf-8');
    return true;
  } catch (error) {
    throw new Error(`Failed to write config to ${CONFIG_PATH}: ${error.message}`);
  }
}

/**
 * Get a specific configuration value.
 * @param {string} key 
 * @param {any} defaultValue 
 * @returns {any}
 */
export function get(key, defaultValue = undefined) {
  const config = readConfig();
  return key in config ? config[key] : defaultValue;
}

/**
 * Set a specific configuration value.
 * @param {string} key 
 * @param {any} value 
 */
export function set(key, value) {
  const config = readConfig();
  config[key] = value;
  writeConfig(config);
  return config;
}

/**
 * Remove a key from configuration.
 * @param {string} key 
 */
export function unset(key) {
  const config = readConfig();
  delete config[key];
  writeConfig(config);
  return config;
}

export default {
  getConfigPath,
  readConfig,
  writeConfig,
  get,
  set,
  unset,
};
