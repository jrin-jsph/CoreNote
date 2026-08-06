import chalk from 'chalk';

export const theme = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  muted: chalk.gray,
  highlight: chalk.cyan.bold,
  priority: {
    high: chalk.red,
    medium: chalk.yellow,
    low: chalk.gray,
  },
};

export const success = chalk.green;
export const error = chalk.red;
export const warning = chalk.yellow;
export const muted = chalk.gray;
export const highlight = chalk.cyan.bold;
export const priority = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.gray,
};

export default theme;
