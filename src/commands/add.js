import { theme } from '../ui/theme.js';
import { parseTodoLine } from '../lib/parser.js';
import { readDayFile, writeDayFile, getTodayDateString } from '../lib/storage.js';
import { syncPushWithWarning } from '../lib/git.js';

export function registerAddCommand(program) {
  program
    .command('add <note...>')
    .description('Add a new note or task to today\'s file')
    .option('-p, --priority <priority>', 'Set priority (high, medium, low)')
    .option('-t, --tag <tags...>', 'Add tags')
    .option('-d, --date <date>', 'Set due date (YYYY-MM-DD)')
    .action((noteParts, options) => {
      const input = noteParts.join(' ');
      let line = input.startsWith('- [') ? input : `- [ ] ${input}`;

      if (options.priority && !line.includes(`!!${options.priority}`)) {
        line += ` !!${options.priority}`;
      }

      if (options.tag && options.tag.length > 0) {
        options.tag.forEach((tag) => {
          const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
          if (!line.includes(cleanTag)) {
            line += ` ${cleanTag}`;
          }
        });
      }

      if (options.date && !line.includes(`@${options.date}`)) {
        line += ` @${options.date}`;
      }

      const parsed = parseTodoLine(line);
      const dateStr = getTodayDateString();
      const sections = readDayFile(dateStr);

      if (!sections.Todos) {
        sections.Todos = [];
      }

      sections.Todos.push(parsed);
      writeDayFile(dateStr, sections, 'add');
      syncPushWithWarning(`add: ${parsed.text}`);

      const color = theme.priority[parsed.priority] || theme.muted;

      console.log(theme.success('✓ Note created and stored locally!'));
      console.log(`Content:  ${theme.highlight(parsed.text)}`);
      if (parsed.priority) {
        console.log(`Priority: ${color(parsed.priority.toUpperCase())}`);
      }
      if (parsed.tags.length > 0) {
        console.log(`Tags:     ${parsed.tags.map((t) => theme.highlight('#' + t)).join(' ')}`);
      }
      if (parsed.dueDate) {
        console.log(`Due Date: ${theme.highlight(parsed.dueDate)}`);
      }
    });
}

export default registerAddCommand;
