import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { readDayFile, writeDayFile, getTodayDateString, ensureFileExists } from '../lib/storage.js';
import { syncPushWithWarning } from '../lib/git.js';

export function registerDoneCommand(program) {
  program
    .command('done <id>')
    .description('Mark a todo as completed by its numeric ID')
    .action((idParam) => {
      const numId = parseInt(idParam, 10);
      if (isNaN(numId) || numId < 1) {
        console.log(theme.error('Please provide a valid numeric todo ID (e.g. `cnte done 1`).'));
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

      const todo = todos[index];
      if (typeof todo === 'object') {
        todo.done = true;
      }

      writeDayFile(dateStr, sections, 'done');
      syncPushWithWarning(`done: task ${numId}`);

      const checkmark = chalk.green('✔');
      const textDisplay = typeof todo === 'object' ? todo.text : todo;
      console.log(`${checkmark} Marked done: "${textDisplay}"`);
    });
}

export default registerDoneCommand;
