import { theme } from '../ui/theme.js';
import config from '../lib/config.js';

export function registerInitCommand(program) {
  program
    .command('init')
    .description('Initialize CoreNote repository and settings')
    .option('--repo <path>', 'Set target notes repository path')
    .option('--github <username>', 'Set GitHub username')
    .action((options) => {
      if (options.repo) {
        config.set('repoPath', options.repo);
      }
      if (options.github) {
        config.set('githubUsername', options.github);
      }

      console.log(theme.success('✓ CoreNote initialized successfully!'));
      console.log(`Config file saved at: ${theme.highlight(config.getConfigPath())}`);
    });
}

export default registerInitCommand;
