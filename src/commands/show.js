import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { readDayFile, getTodayDateString, ensureFileExists } from '../lib/storage.js';
import { syncPullWithWarning } from '../lib/git.js';

export function registerShowCommand(program) {
  program
    .command('show [date]')
    .alias('cat')
    .description('Print the complete day file with Chalk styling')
    .action((dateParam) => {
      syncPullWithWarning();
      const targetDate = dateParam || getTodayDateString();
      ensureFileExists(targetDate);
      const sections = readDayFile(targetDate);

      console.log(`\n${chalk.bold.cyan.underline(`# ${targetDate}`)}\n`);

      for (const [sectionTitle, items] of Object.entries(sections)) {
        console.log(chalk.bold.underline(`## ${sectionTitle}`));

        if (!items || items.length === 0) {
          console.log(chalk.gray('  (empty)\n'));
          continue;
        }

        items.forEach((item) => {
          if (typeof item === 'string') {
            // Notes section or paragraph / string items -> italic/gray
            if (sectionTitle.toLowerCase() === 'notes') {
              console.log(`  ${chalk.italic.gray(item)}`);
            } else {
              console.log(`  ${item}`);
            }
          } else if (item && typeof item === 'object') {
            if (item.type === 'paragraph') {
              console.log(`  ${chalk.italic.gray(item.text)}`);
            } else if (item.type === 'bullet') {
              const text = item.text.startsWith('- ') ? item.text : `- ${item.text}`;
              console.log(`  ${text}`);
            } else {
              // Checkbox Todo
              const checkbox = item.done ? chalk.green('[x]') : chalk.gray('[ ]');
              const textStr = item.done ? chalk.strikethrough(item.text) : item.text;
              const tagsStr = (item.tags || []).map((t) => chalk.cyan(`#${t}`)).join(' ');

              let prioStr = '';
              if (item.priority) {
                const prioVal = String(item.priority).toLowerCase();
                if (prioVal === '1' || prioVal === 'high') prioStr = chalk.red(`!!${item.priority}`);
                else if (prioVal === '2' || prioVal === 'medium') prioStr = chalk.yellow(`!!${item.priority}`);
                else prioStr = chalk.gray(`!!${item.priority}`);
              }

              let dueStr = '';
              if (item.dueDate) {
                const isOverdue = /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) && item.dueDate < getTodayDateString();
                dueStr = isOverdue ? chalk.red(`@${item.dueDate}`) : chalk.gray(`@${item.dueDate}`);
              }

              const line = `  ${checkbox} ${textStr} ${tagsStr} ${prioStr} ${dueStr}`.replace(/\s+/g, ' ').trim();
              console.log(`  ${line}`);
            }
          }
        });

        console.log(''); // Spacing after section
      }
    });
}

export default registerShowCommand;
