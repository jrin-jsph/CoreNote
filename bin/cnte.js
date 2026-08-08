#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { theme } from '../src/ui/theme.js';
import { parseEntry } from '../src/lib/entryParser.js';
import { readDayFile, writeDayFile, getTodayDateString } from '../src/lib/storage.js';
import { syncPushWithWarning } from '../src/lib/git.js';
import { launchTUI } from '../src/ui/App.js';
import { getCwdGitContext } from '../src/lib/gitContext.js';

import registerConfigCommand from '../src/commands/config.js';
import registerAddCommand from '../src/commands/add.js';
import registerListCommand from '../src/commands/list.js';
import registerSyncCommand from '../src/commands/sync.js';
import registerInitCommand from '../src/commands/init.js';
import registerDoneCommand from '../src/commands/done.js';
import registerEditCommand from '../src/commands/edit.js';
import registerDeleteCommand from '../src/commands/delete.js';
import registerUndoCommand from '../src/commands/undo.js';
import registerShowCommand from '../src/commands/show.js';
import registerRemoteCommand from '../src/commands/remote.js';
import registerCarryCommand from '../src/commands/carry.js';
import registerStatsCommand from '../src/commands/stats.js';
import registerWhoamiCommand from '../src/commands/whoami.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));

// If user ran `cnte` with no arguments, launch interactive Ink TUI
if (process.argv.length <= 2) {
  launchTUI();
} else {

  // Helper function to handle smart entry execution
  function handleSmartEntry(rawInput) {
    const entry = parseEntry(rawInput);

    const gitContext = getCwdGitContext();
    if (gitContext) {
      if (!entry.project && gitContext.repoName) {
        entry.project = gitContext.repoName;
      }
      const hasBranchFlag = process.argv.includes('-b') || process.argv.includes('--branch');
      if (hasBranchFlag && gitContext.branch) {
        entry.branch = gitContext.branch;
      }
    }
    const dateStr = getTodayDateString();

    const sections = readDayFile(dateStr);
    if (!sections[entry.section]) {
      sections[entry.section] = [];
    }

    sections[entry.section].push(entry);
    writeDayFile(dateStr, sections, 'add');
    syncPushWithWarning(`add: ${entry.text}`);

    // Build metadata output string
    const metaParts = [];
    if (entry.project) {
      metaParts.push(`project: ${entry.project}`);
    }
    if (entry.branch) {
      metaParts.push(`branch: ${entry.branch}`);
    }
    if (entry.tags && entry.tags.length > 0) {
      metaParts.push(`tags: ${entry.tags.map((t) => '#' + t).join(', ')}`);
    }
    if (entry.priority) {
      metaParts.push(`priority: !!${entry.priority}`);
    }
    if (entry.dueDate) {
      metaParts.push(`due: ${entry.dueDate}`);
    }

    const metaStr = metaParts.length > 0 ? chalk.gray(`  (${metaParts.join(', ')})`) : '';
    const checkmark = chalk.green('✔');
    const sectionName = chalk.cyan(entry.section);

    console.log(`${checkmark} Added to ${sectionName}: "${entry.text}"${metaStr}`);
  }

  // Intercept positional raw input if not matching known CLI commands or flags
  const knownCommands = [
    'init',
    'add',
    'list',
    'ls',
    'done',
    'edit',
    'delete',
    'rm',
    'del',
    'undo',
    'show',
    'cat',
    'remote',
    'carry',
    'stats',
    'whoami',
    'config',
    'sync',
    'help',
    '-v',
    '--version',
    '-h',
    '--help',
  ];

  const firstArg = process.argv[2];

  if (firstArg && !knownCommands.includes(firstArg)) {
    const rawInput = process.argv.slice(2).join(' ');
    handleSmartEntry(rawInput);
    process.exit(0);
  }

  const program = new Command();

  program
    .name('cnte')
    .description(theme.highlight('CoreNote (cnte)') + ' - Developer note taking & task CLI')
    .version(pkg.version, '-v, --version', 'Output the current version of CoreNote');

  // Custom help formatting
  program.addHelpText('before', `
${theme.highlight(' CoreNote CLI')} ${theme.muted('v' + pkg.version)}
${theme.muted('====================================')}
`);

  program.addHelpText('after', `
${theme.highlight('Quick Usage:')}
  $ cnte                                          (Interactive Terminal UI)
  $ cnte "fix ssl bug #backend !!2 @tomorrow"    (Smart Todo Entry)
  $ cnte list [--all] [--tag <t>] [--priority <n>] (List Todos)
  $ cnte done <id>                                (Mark Todo Done)
  $ cnte edit <id> "<new text>"                   (Edit Todo)
  $ cnte delete <id> / cnte rm <id>               (Delete Todo)
  $ cnte carry                                    (Carry Forward Undone Todos)
  $ cnte stats                                    (Productivity Statistics)
  $ cnte whoami                                   (User Profile & Sync Info)
  $ cnte undo                                     (Undo Last Change)
  $ cnte show | cnte cat                          (Show Day File)
  $ cnte remote <url>                             (Set Git Remote URL)

${theme.muted('For more help on a specific command, run:')}
  $ cnte <command> --help
`);

  // Register all subcommands
  registerInitCommand(program);
  registerAddCommand(program);
  registerListCommand(program);
  registerDoneCommand(program);
  registerEditCommand(program);
  registerDeleteCommand(program);
  registerCarryCommand(program);
  registerStatsCommand(program);
  registerWhoamiCommand(program);
  registerUndoCommand(program);
  registerShowCommand(program);
  registerRemoteCommand(program);
  registerConfigCommand(program);
  registerSyncCommand(program);

  program
    .argument('[text...]', 'Smart entry text to add to today\'s note')
    .action((textParts) => {
      if (!textParts || textParts.length === 0) {
        launchTUI();
        return;
      }
      handleSmartEntry(textParts.join(' '));
    });

  program.parse(process.argv);
}
