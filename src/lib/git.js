import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import chalk from 'chalk';
import config from './config.js';
import { parseMarkdownToSections, sectionsToMarkdown, mergeSections } from './parser.js';

/**
 * Get path to ~/.corenote storage root
 * @returns {string}
 */
export function getNotesDir() {
  return path.join(os.homedir(), '.corenote');
}

/**
 * Helper to run git command in ~/.corenote
 * @param {string} command 
 * @param {string} [cwd] 
 * @returns {string} Standard output
 */
function execGit(command, cwd = getNotesDir()) {
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd, { recursive: true });
  }
  return execSync(`git ${command}`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Check if ~/.corenote is a git repository
 * @returns {boolean}
 */
export function isGitRepo() {
  try {
    const res = execGit('rev-parse --is-inside-work-tree');
    return res === 'true';
  } catch {
    return false;
  }
}

/**
 * Initialize git repository in ~/.corenote and set remote origin
 * @param {string} remoteUrl 
 * @returns {{ success: boolean, remoteUrl?: string, error?: string }}
 */
export function initRepo(remoteUrl) {
  try {
    const cwd = getNotesDir();
    if (!isGitRepo()) {
      execGit('init', cwd);
    }
    if (remoteUrl) {
      try {
        execGit('remote get-url origin', cwd);
        execGit(`remote set-url origin "${remoteUrl}"`, cwd);
      } catch {
        execGit(`remote add origin "${remoteUrl}"`, cwd);
      }
    }
    return { success: true, remoteUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Extract ours and theirs versions from file content containing Git conflict markers
 * @param {string} content 
 * @returns {{ oursText: string, theirsText: string }}
 */
export function resolveConflictMarkers(content) {
  const lines = content.split(/\r?\n/);
  const oursLines = [];
  const theirsLines = [];

  let state = 'normal'; // 'normal' | 'ours' | 'theirs'

  for (const line of lines) {
    if (line.startsWith('<<<<<<<')) {
      state = 'ours';
    } else if (line.startsWith('=======') && state === 'ours') {
      state = 'theirs';
    } else if (line.startsWith('>>>>>>>') && state === 'theirs') {
      state = 'normal';
    } else {
      if (state === 'normal') {
        oursLines.push(line);
        theirsLines.push(line);
      } else if (state === 'ours') {
        oursLines.push(line);
      } else if (state === 'theirs') {
        theirsLines.push(line);
      }
    }
  }

  return {
    oursText: oursLines.join('\n'),
    theirsText: theirsLines.join('\n'),
  };
}

/**
 * Perform git pull --rebase --quiet safely with automatic conflict resolution
 * @returns {{ success: boolean, error: string | null, conflictMerged?: boolean }}
 */
export function pull() {
  if (!isGitRepo()) {
    return { success: false, error: 'Not a git repository' };
  }
  try {
    execGit('pull --rebase --quiet');
    config.set('lastSyncTime', new Date().toISOString());
    return { success: true, error: null };
  } catch (error) {
    // Attempt automatic merge conflict resolution
    try {
      const cwd = getNotesDir();
      const todosDir = path.join(cwd, 'todos');

      if (fs.existsSync(todosDir)) {
        const files = fs.readdirSync(todosDir).filter((f) => f.endsWith('.md'));
        let conflictResolved = false;

        for (const file of files) {
          const filePath = path.join(todosDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');

          if (content.includes('<<<<<<<') && content.includes('>>>>>>>')) {
            const dateString = file.replace(/\.md$/, '');
            const { oursText, theirsText } = resolveConflictMarkers(content);

            const sectionsOurs = parseMarkdownToSections(oursText);
            const sectionsTheirs = parseMarkdownToSections(theirsText);
            const mergedSections = mergeSections(sectionsOurs, sectionsTheirs);

            const mergedMarkdown = sectionsToMarkdown(dateString, mergedSections);
            fs.writeFileSync(filePath, mergedMarkdown, 'utf-8');

            execGit(`add "${filePath}"`, cwd);
            conflictResolved = true;
          }
        }

        if (conflictResolved) {
          try {
            execSync('git rebase --continue', {
              cwd,
              encoding: 'utf-8',
              env: { ...process.env, GIT_EDITOR: 'true', GIT_SEQUENCE_EDITOR: 'true' },
              stdio: ['pipe', 'pipe', 'pipe'],
            });
          } catch {
            try {
              execGit('commit --no-edit', cwd);
            } catch {
              // Ignore commit error if rebase finalized
            }
          }

          push('merge: resolved sync conflict');
          console.log(chalk.yellow('⚠ Synced with a conflict — automatically merged, nothing lost'));
          return { success: true, error: null, conflictMerged: true };
        }
      }
    } catch (conflictErr) {
      try {
        execGit('rebase --abort');
      } catch {}
    }

    return { success: false, error: error.message };
  }
}

/**
 * Perform git add ., git commit, git push --quiet safely
 * @param {string} [commitMessage] 
 * @returns {{ success: boolean, error: string | null }}
 */
export function push(commitMessage = 'update notes') {
  if (!isGitRepo()) {
    return { success: false, error: 'Not a git repository' };
  }
  try {
    const cwd = getNotesDir();
    execGit('add .', cwd);

    // Commit changes if any
    try {
      const safeMessage = commitMessage.replace(/"/g, '\\"');
      execGit(`commit -m "${safeMessage}"`, cwd);
    } catch (commitErr) {
      // Nothing to commit is normal
    }

    execGit('push --quiet', cwd);
    config.set('lastSyncTime', new Date().toISOString());
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute pull before read commands with silent syncing message and graceful fallback warning
 */
export function syncPullWithWarning() {
  if (!isGitRepo()) {
    return;
  }
  process.stdout.write(chalk.gray('syncing...\r'));
  const res = pull();
  process.stdout.write('           \r');
  if (!res.success && !res.conflictMerged) {
    console.log(chalk.yellow('⚠ Could not sync — working from local copy'));
  }
}

/**
 * Execute push after write commands with graceful fallback warning
 * @param {string} commitMessage 
 */
export function syncPushWithWarning(commitMessage) {
  if (!isGitRepo()) {
    return;
  }
  const res = push(commitMessage);
  if (!res.success) {
    console.log(chalk.yellow('⚠ Could not sync — changes saved locally'));
  }
}

export default {
  getNotesDir,
  isGitRepo,
  initRepo,
  pull,
  push,
  resolveConflictMarkers,
  syncPullWithWarning,
  syncPushWithWarning,
};
