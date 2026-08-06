import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { parseTodoLine } from '../lib/parser.js';
import { readDayFile, writeDayFile, getTodayDateString, ensureFileExists } from '../lib/storage.js';
import { syncPushWithWarning } from '../lib/git.js';

export function registerEditCommand(program) {
  program
    .command('edit <id> <newText...>')
    .description('Edit an existing todo text by its numeric ID')
    .action((idParam, newTextParts) => {
      const numId = parseInt(idParam, 10);
      if (isNaN(numId) || numId < 1) {
        console.log(theme.error('Please provide a valid numeric todo ID (e.g. `cnte edit 1 "new text"`).'));
        return;
      }

      const input = newTextParts.join(' ');
      const dateStr = getTodayDateString();
      ensureFileExists(dateStr);
      const sections = readDayFile(dateStr);

      const todos = sections.Todos || [];
      const index = numId - 1;

      if (index < 0 || index >= todos.length) {
        console.log(theme.error(`Todo ID ${numId} not found in today's file (${todos.length} total todos).`));
        return;
      }

      const currentTodo = todos[index];
      const isDone = typeof currentTodo === 'object' ? currentTodo.done : false;

      // Re-parse new text to extract tags, priority, and due date
      const formattedInput = input.startsWith('- [') ? input : `- [${isDone ? 'x' : ' '}] ${input}`;
      const updatedTodo = parseTodoLine(formattedInput);

      todos[index] = updatedTodo;
      writeDayFile(dateStr, sections, 'edit');
      syncPushWithWarning(`edit: task ${numId}`);

      const checkmark = chalk.green('✔');
      console.log(`${checkmark} Updated: "${updatedTodo.text}"`);
    });
}

export default registerEditCommand;
