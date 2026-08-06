import chalk from 'chalk';

export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'GITHUB_CLIENT_ID_PLACEHOLDER';

/**
 * Request device code from GitHub OAuth Device Authorization endpoint
 * @returns {Promise<{ device_code: string, user_code: string, verification_uri: string, expires_in: number, interval: number }>}
 */
export async function requestDeviceCode() {
  try {
    const res = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: 'repo',
      }),
    });

    if (!res.ok) {
      throw new Error(`Device code request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    throw new Error(`GitHub Device Flow initialization failed: ${error.message}`);
  }
}

/**
 * Poll GitHub endpoint until user authorizes device code or token expires
 * @param {string} deviceCode 
 * @param {number} [intervalSec] 
 * @param {number} [expiresInSec] 
 * @returns {Promise<{ success: boolean, accessToken?: string, error?: string }>}
 */
export async function pollForAccessToken(deviceCode, intervalSec = 5, expiresInSec = 900) {
  const startTime = Date.now();
  const timeoutMs = expiresInSec * 1000;
  let currentIntervalMs = Math.max(1, intervalSec) * 1000;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, currentIntervalMs));

    try {
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      const data = await res.json();

      if (data.access_token) {
        return { success: true, accessToken: data.access_token };
      }

      if (data.error === 'authorization_pending') {
        continue;
      }

      if (data.error === 'slow_down') {
        currentIntervalMs += 5000;
        continue;
      }

      if (data.error) {
        return {
          success: false,
          error: data.error_description || data.error,
        };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Device code authorization timed out' };
}

export default {
  GITHUB_CLIENT_ID,
  requestDeviceCode,
  pollForAccessToken,
};
