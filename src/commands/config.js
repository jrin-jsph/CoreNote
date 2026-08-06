import config from '../lib/config.js';
import { theme } from '../ui/theme.js';

export function registerConfigCommand(program) {
  const configCmd = program
    .command('config')
    .description('Manage CoreNote configuration settings (~/.corenoterc)');

  configCmd
    .command('get [key]')
    .description('Get configuration value by key or print full config')
    .action((key) => {
      if (key) {
        const val = config.get(key);
        if (val !== undefined) {
          console.log(`${theme.highlight(key)}: ${val}`);
        } else {
          console.log(theme.warning(`Configuration key "${key}" is not set.`));
        }
      } else {
        const fullConfig = config.readConfig();
        console.log(theme.highlight('CoreNote Configuration (~/.corenoterc):'));
        console.log(JSON.stringify(fullConfig, null, 2));
      }
    });

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration key value')
    .action((key, value) => {
      config.set(key, value);
      console.log(theme.success(`Updated ${theme.highlight(key)} = "${value}" in ~/.corenoterc`));
    });

  configCmd
    .command('unset <key>')
    .description('Remove a configuration key')
    .action((key) => {
      config.unset(key);
      console.log(theme.success(`Removed ${theme.highlight(key)} from ~/.corenoterc`));
    });
}

export default registerConfigCommand;
