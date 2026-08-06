import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import {
  readDayFile,
  writeDayFile,
  getTodayDateString,
  getYesterdayDateString,
  ensureFileExists,
} from '../lib/storage.js';
import { syncPushWithWarning } from '../lib/git.js';

export function registerCarryCommand(program) {
  program
    .command('carry')
    .description("Carry forward yesterday's uncompleted todos into today's file")
    .action(() => {
      const yesterdayStr = getYesterdayDateString();
      const todayStr = getTodayDateString();

      ensureFileExists(todayStr);

      const yesterdaySections = readDayFile(yesterdayStr);
      const todaySections = readDayFile(todayStr);

      const yesterdayTodos = yesterdaySections.Todos || [];
      const todayTodos = todaySections.Todos || [];

      // Filter undone items from yesterday
      const undoneItems = yesterdayTodos.filter(
        (item) => item && typeof item === 'object' && !item.done
      );

      if (undoneItems.length === 0) {
        console.log(theme.muted("No uncompleted todos found from yesterday to carry forward."));
        return;
      }

      // Existing today todo texts for exact match deduplication
      const existingTexts = new Set(
        todayTodos
          .filter((item) => item && typeof item === 'object')
          .map((item) => (item.text || '').trim())
      );

      let carriedCount = 0;

      for (const item of undoneItems) {
        const itemText = (item.text || '').trim();
        if (!existingTexts.has(itemText)) {
          // Clone item into today's list
          todayTodos.push({ ...item });
          existingTexts.add(itemText);
          carriedCount++;
        }
      }

      if (carriedCount > 0) {
        todaySections.Todos = todayTodos;
        writeDayFile(todayStr, todaySections, 'carry');
        syncPushWithWarning(`carry: forward ${carriedCount} todos`);

        const checkmark = chalk.green('✔');
        console.log(`${checkmark} Carried forward ${carriedCount} todo${carriedCount === 1 ? '' : 's'}`);
      } else {
        console.log(theme.muted("All uncompleted todos from yesterday are already present in today's list."));
      }
    });
}

export default registerCarryCommand;
