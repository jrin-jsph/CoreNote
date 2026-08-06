import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { initRepo } from '../lib/git.js';
import config from '../lib/config.js';

export function registerRemoteCommand(program) {
  program
    .command('remote <url>')
    .description('Manually set up the Git remote URL for ~/.corenote')
    .action((url) => {
      const result = initRepo(url);
      if (!result.success) {
        console.log(theme.error(`Failed to configure Git remote: ${result.error}`));
        return;
      }

      config.set('remoteUrl', url);
      const checkmark = chalk.green('✔');
      console.log(`${checkmark} Git remote set to: ${chalk.cyan(url)}`);
    });
}

export default registerRemoteCommand;
