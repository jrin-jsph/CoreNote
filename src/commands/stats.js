import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { listAllDayFiles, readDayFile, getTodayDateString } from '../lib/storage.js';

export function registerStatsCommand(program) {
  program
    .command('stats')
    .description('Display productivity statistics and streak insights')
    .action(() => {
      const allDates = listAllDayFiles();
      const todayStr = getTodayDateString();

      if (!allDates.includes(todayStr)) {
        allDates.push(todayStr);
        allDates.sort();
      }

      let totalCompleted = 0;
      let totalTodos = 0;
      let totalEntries = 0;
      const activeDatesSet = new Set();

      for (const dateStr of allDates) {
        const sections = readDayFile(dateStr);
        let dayHasEntries = false;

        for (const [secTitle, items] of Object.entries(sections)) {
          if (!items || items.length === 0) continue;

          items.forEach((item) => {
            totalEntries++;
            dayHasEntries = true;
            if (item && typeof item === 'object' && item.type !== 'paragraph' && item.type !== 'bullet') {
              totalTodos++;
              if (item.done) {
                totalCompleted++;
              }
            }
          });
        }

        if (dayHasEntries) {
          activeDatesSet.add(dateStr);
        }
      }

      // Calculate streak ending today or yesterday
      let streak = 0;
      const checkDate = new Date();

      while (true) {
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const dStr = `${year}-${month}-${day}`;

        if (activeDatesSet.has(dStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // If checking today and today has no entries yet, try starting from yesterday
          if (dStr === todayStr && streak === 0) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }
      }

      const completionRate = totalTodos > 0 ? Math.round((totalCompleted / totalTodos) * 100) : 0;
      const daysCount = Math.max(1, activeDatesSet.size);
      const avgPerDay = (totalEntries / daysCount).toFixed(1);

      const streakVal = `${streak} day${streak === 1 ? '' : 's'}`;
      const compVal = `${completionRate}%`;
      const avgVal = `${avgPerDay}`;

      // Box drawing characters
      const titleLine  = '┌─ Stats ─────────────┐';
      const streakLine = `│ Streak:     ${streakVal.padEnd(8)} │`;
      const compLine   = `│ Completion: ${compVal.padEnd(8)} │`;
      const avgLine    = `│ Avg/day:    ${avgVal.padEnd(8)} │`;
      const bottomLine = '└─────────────────────┘';

      console.log(`\n${theme.highlight(titleLine)}`);
      console.log(theme.highlight(streakLine));
      console.log(theme.highlight(compLine));
      console.log(theme.highlight(avgLine));
      console.log(theme.highlight(bottomLine) + '\n');
    });
}

export default registerStatsCommand;
