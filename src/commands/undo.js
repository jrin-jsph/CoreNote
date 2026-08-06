import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { restoreUndoSnapshot } from '../lib/storage.js';
import { syncPushWithWarning } from '../lib/git.js';

export function registerUndoCommand(program) {
  program
    .command('undo')
    .description('Revert the last write action')
    .action(() => {
      const restored = restoreUndoSnapshot();
      if (!restored) {
        console.log(theme.warning('No previous action available to undo.'));
        return;
      }

      syncPushWithWarning('undo: reverted last action');
      const checkmark = chalk.green('✔');
      console.log(`${checkmark} Reverted last action (${restored.actionName || 'write'})`);
    });
}

export default registerUndoCommand;
