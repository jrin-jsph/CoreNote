import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import config from '../lib/config.js';

export function registerWhoamiCommand(program) {
  program
    .command('whoami')
    .description('Display logged-in user profile and sync status information')
    .action(() => {
      const username = config.get('githubUsername');
      const lastSync = config.get('lastSyncTime');

      console.log(`\n${theme.highlight('CoreNote User Profile:')}`);
      console.log(theme.muted('===================================='));

      if (username) {
        console.log(`GitHub Username: ${theme.highlight(username)}`);
      } else {
        console.log(`GitHub Username: ${theme.muted('(not set - run `cnte config set githubUsername <username>`)')}`);
      }

      if (lastSync) {
        const formattedDate = new Date(lastSync).toLocaleString();
        console.log(`Last Sync:       ${chalk.green(formattedDate)}`);
      } else {
        console.log(`Last Sync:       ${theme.muted('Never')}`);
      }
      console.log('');
    });
}

export default registerWhoamiCommand;
