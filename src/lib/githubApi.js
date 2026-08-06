/**
 * GitHub API helper for repository provisioning and authenticated user profile
 */

const GITHUB_API_BASE = 'https://api.github.com';

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'corenote-cli',
  };
}

/**
 * Get authenticated user profile details from GitHub API
 * @param {string} token 
 * @returns {Promise<{ login: string, id: number, html_url: string }>}
 */
export async function getAuthenticatedUser(token) {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch GitHub user profile (status ${res.status})`);
  }

  return await res.json();
}

/**
 * Check if private repository exists; if not, create it automatically via GitHub API
 * @param {string} token 
 * @param {string} [repoName] 
 * @returns {Promise<{ created: boolean, repo: any, cloneUrl: string, username: string }>}
 */
export async function ensurePrivateRepo(token, repoName = 'corenote-data') {
  const user = await getAuthenticatedUser(token);
  const username = user.login;

  // Check if repository already exists
  const checkRes = await fetch(`${GITHUB_API_BASE}/repos/${username}/${repoName}`, {
    headers: getHeaders(token),
  });

  if (checkRes.ok) {
    const existingRepo = await checkRes.json();
    return {
      created: false,
      repo: existingRepo,
      cloneUrl: existingRepo.clone_url,
      username,
    };
  }

  if (checkRes.status !== 404) {
    throw new Error(`Unexpected response checking repo ${username}/${repoName}: status ${checkRes.status}`);
  }

  // Create new private repository
  const createRes = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      description: 'CoreNote personal note & task data repository',
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create private repository ${repoName}: ${errData.message || createRes.statusText}`);
  }

  const newRepo = await createRes.json();
  return {
    created: true,
    repo: newRepo,
    cloneUrl: newRepo.clone_url,
    username,
  };
}

export default {
  getAuthenticatedUser,
  ensurePrivateRepo,
};
