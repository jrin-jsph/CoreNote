import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { requestDeviceCode, pollForAccessToken } from '../lib/githubAuth.js';
import { ensurePrivateRepo } from '../lib/githubApi.js';
import keyring from '../lib/keyring.js';
import { initRepo, push } from '../lib/git.js';
import config from '../lib/config.js';

export function registerInitCommand(program) {
  program
    .command('init')
    .description('Initialize CoreNote with guided GitHub OAuth Device Flow and private repo setup')
    .option('--token <token>', 'Supply GitHub Personal Access Token directly (bypass device flow for CI/testing)')
    .action(async (options) => {
      console.log(`\n${theme.highlight(' CoreNote Guided Setup')}`);
      console.log(theme.muted('====================================\n'));

      let token = options.token;

      if (!token) {
        console.log(`${chalk.cyan('Step 1/4:')} Requesting GitHub Device Authorization...`);
        try {
          const deviceData = await requestDeviceCode();

          const boxTop    = '┌───────────────────────────────────────────────────┐';
          const line1     = `│ Visit: ${chalk.cyan.bold(deviceData.verification_uri.padEnd(42))} │`;
          const line2     = `│ Code:  ${chalk.yellow.bold(deviceData.user_code.padEnd(42))} │`;
          const boxBottom = '└───────────────────────────────────────────────────┘';

          console.log(`\n${theme.highlight(boxTop)}`);
          console.log(line1);
          console.log(line2);
          console.log(`${theme.highlight(boxBottom)}\n`);

          console.log(`${chalk.cyan('Step 2/4:')} Waiting for GitHub authorization...`);
          const pollRes = await pollForAccessToken(deviceData.device_code, deviceData.interval || 5, deviceData.expires_in || 900);

          if (!pollRes.success) {
            console.log(theme.error(`\n❌ Authorization failed: ${pollRes.error}`));
            return;
          }

          token = pollRes.accessToken;
          console.log(theme.success('✔ GitHub authorization granted!\n'));
        } catch (err) {
          console.log(theme.error(`❌ Setup initialization error: ${err.message}`));
          return;
        }
      }

      // Step 3: Save Token in Keychain
      console.log(`${chalk.cyan('Step 3/4:')} Saving token to OS Keychain...`);
      await keyring.saveToken(token);
      console.log(theme.success('✔ Token saved securely.\n'));

      // Step 4: Provision Private GitHub Repository
      console.log(`${chalk.cyan('Step 4/4:')} Provisioning private "corenote-data" repository...`);
      try {
        const repoInfo = await ensurePrivateRepo(token, 'corenote-data');

        if (repoInfo.created) {
          console.log(theme.success(`✔ Created new private repository: ${chalk.cyan(repoInfo.username + '/corenote-data')}`));
        } else {
          console.log(theme.success(`✔ Linked existing private repository: ${chalk.cyan(repoInfo.username + '/corenote-data')}`));
        }

        // Configure authenticated remote URL in ~/.corenote
        const authRemoteUrl = `https://${token}@github.com/${repoInfo.username}/corenote-data.git`;
        initRepo(authRemoteUrl);

        // Update ~/.corenoterc configuration
        config.set('githubUsername', repoInfo.username);
        config.set('repoUrl', `https://github.com/${repoInfo.username}/corenote-data`);
        config.set('lastSyncTime', new Date().toISOString());

        // Perform initial push sync
        push('init: setup corenote data repo');

        console.log(`\n${theme.success('🎉 CoreNote setup complete!')}`);
        console.log(`Repository: ${theme.highlight('https://github.com/' + repoInfo.username + '/corenote-data')}`);
        console.log(`User:       ${theme.highlight(repoInfo.username)}\n`);
      } catch (err) {
        console.log(theme.error(`❌ Repository provisioning error: ${err.message}`));
      }
    });
}

export default registerInitCommand;
