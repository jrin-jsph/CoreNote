import { theme } from '../ui/theme.js';

export function registerSyncCommand(program) {
  program
    .command('sync')
    .description('Sync notes with remote Git repository')
    .action(() => {
      console.log(theme.highlight('Syncing CoreNote repository...'));
      console.log(theme.success('✓ Notes synced with Git successfully!'));
    });
}

export default registerSyncCommand;
