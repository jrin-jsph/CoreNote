import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { readDayFile, getTodayDateString, listAllDayFiles, ensureFileExists } from '../lib/storage.js';
import { syncPullWithWarning } from '../lib/git.js';

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function registerListCommand(program) {
  program
    .command('list')
    .alias('ls')
    .description('List todos with filtering options')
    .option('-a, --all', 'Show todos across all daily files, grouped by date')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('-p, --priority <priority>', 'Filter by priority (1, 2, 3 or high, medium, low)')
    .option('-d, --due <due>', 'Filter by due status (today, tomorrow, overdue)')
    .action((options) => {
      syncPullWithWarning();
      const todayStr = getTodayDateString();
      const tomorrowStr = getTomorrowDateString();
      ensureFileExists(todayStr);

      const datesToProcess = options.all ? listAllDayFiles() : [todayStr];
      let totalFound = 0;

      for (const dateStr of datesToProcess) {
        const sections = readDayFile(dateStr);
        const todos = sections.Todos || [];

        if (todos.length === 0 && !options.all) {
          console.log(theme.muted(`No todos found for ${dateStr}. Use \`cnte "your task"\` to add one!`));
          continue;
        }

        const matchingTodos = [];

        todos.forEach((item, index) => {
          if (!item || typeof item !== 'object') return;

          const numericId = index + 1;

          // Priority filter
          if (options.priority) {
            const reqPrio = String(options.priority).toLowerCase();
            const itemPrio = String(item.priority || '').toLowerCase();
            if (reqPrio !== itemPrio) return;
          }

          // Tag filter
          if (options.tag) {
            const reqTag = options.tag.replace(/^#/, '').toLowerCase();
            const hasTag = (item.tags || []).some((t) => t.toLowerCase() === reqTag);
            if (!hasTag) return;
          }

          // Due date filter
          if (options.due) {
            const reqDue = options.due.toLowerCase();
            const itemDue = (item.dueDate || '').toLowerCase();

            if (reqDue === 'today') {
              if (itemDue !== 'today' && itemDue !== todayStr) return;
            } else if (reqDue === 'tomorrow') {
              if (itemDue !== 'tomorrow' && itemDue !== tomorrowStr) return;
            } else if (reqDue === 'overdue') {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(itemDue) || itemDue >= todayStr) return;
            }
          }

          matchingTodos.push({ numericId, todo: item });
        });

        if (matchingTodos.length > 0) {
          console.log(`\n${theme.highlight('## Todos')} ${theme.muted('(' + dateStr + ')')}`);
          console.log(theme.muted('------------------------------------'));

          matchingTodos.forEach(({ numericId, todo }) => {
            const checkbox = todo.done ? chalk.green('[x]') : chalk.gray('[ ]');
            const idStr = chalk.yellow(`${numericId}.`);
            const textStr = todo.done ? chalk.strikethrough(todo.text) : todo.text;
            
            const tagsStr = (todo.tags || []).map((t) => chalk.cyan(`#${t}`)).join(' ');

            // Priority styling
            let prioStr = '';
            if (todo.priority) {
              const prioVal = String(todo.priority).toLowerCase();
              if (prioVal === '1' || prioVal === 'high') {
                prioStr = chalk.red(`!!${todo.priority}`);
              } else if (prioVal === '2' || prioVal === 'medium') {
                prioStr = chalk.yellow(`!!${todo.priority}`);
              } else {
                prioStr = chalk.gray(`!!${todo.priority}`);
              }
            }

            // Due date styling
            let dueStr = '';
            if (todo.dueDate) {
              const dueVal = todo.dueDate.toLowerCase();
              const isOverdue = /^\d{4}-\d{2}-\d{2}$/.test(dueVal) && dueVal < todayStr;
              if (isOverdue) {
                dueStr = chalk.red(`@${todo.dueDate} (overdue)`);
              } else if (dueVal === 'today' || dueVal === todayStr) {
                dueStr = chalk.yellow(`@${todo.dueDate}`);
              } else {
                dueStr = chalk.gray(`@${todo.dueDate}`);
              }
            }

            const row = ` ${idStr} ${checkbox} ${textStr} ${tagsStr} ${prioStr} ${dueStr}`.replace(/\s+/g, ' ').trim();
            console.log(row);
            totalFound++;
          });
        }
      }

      if (totalFound === 0 && (options.tag || options.priority || options.due)) {
        console.log(theme.warning('\nNo todos matched the specified filters.'));
      }
    });
}

export default registerListCommand;
