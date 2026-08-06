import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Get Git repository context from the current working directory
 * @returns {{ repoName: string, branch: string } | null}
 */
export function getCwdGitContext() {
  try {
    const isGit = execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim() === 'true';

    if (!isGit) return null;

    let repoName = '';
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (remoteUrl) {
        repoName = path.basename(remoteUrl, '.git');
      }
    } catch {}

    if (!repoName) {
      repoName = path.basename(process.cwd());
    }

    let branch = '';
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch {}

    return {
      repoName,
      branch,
    };
  } catch {
    return null;
  }
}

export default {
  getCwdGitContext,
};
