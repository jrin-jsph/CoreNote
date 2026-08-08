import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { readDayFile, writeDayFile, getTodayDateString, ensureFileExists } from '../lib/storage.js';
import { syncPushWithWarning } from '../lib/git.js';

export function registerDeleteCommand(program) {
  program
    .command('delete <id>')
    .alias('rm')
    .alias('del')
    .description('Delete a todo item by its numeric ID')
    .action((idParam) => {
      const numId = parseInt(idParam, 10);
      if (isNaN(numId) || numId < 1) {
        console.log(theme.error('Please provide a valid numeric todo ID (e.g. `cnte delete 1` or `cnte rm 1`).'));
        return;
      }

      const dateStr = getTodayDateString();
      ensureFileExists(dateStr);
      const sections = readDayFile(dateStr);

      const todos = sections.Todos || [];
      const index = numId - 1;

      if (index < 0 || index >= todos.length) {
        console.log(theme.error(`Todo ID ${numId} not found in today's file (${todos.length} total todos).`));
        return;
      }

      const removed = todos.splice(index, 1)[0];
      sections.Todos = todos;

      writeDayFile(dateStr, sections, 'delete');
      syncPushWithWarning(`delete: task ${numId}`);

      const checkmark = chalk.green('✔');
      const textDisplay = typeof removed === 'object' ? removed.text : removed;
      console.log(`${checkmark} Deleted: "${textDisplay}"`);
    });
}

export default registerDeleteCommand;
