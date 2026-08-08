import chalk from 'chalk';
import readline from 'node:readline';
import { theme } from '../ui/theme.js';
import { requestDeviceCode, pollForAccessToken } from '../lib/githubAuth.js';
import { ensurePrivateRepo, getAuthenticatedUser } from '../lib/githubApi.js';
import keyring from '../lib/keyring.js';
import { initRepo, push } from '../lib/git.js';
import config from '../lib/config.js';

function promptInput(questionText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerInitCommand(program) {
  program
    .command('init')
    .description('Initialize CoreNote with guided GitHub setup and private repo connection')
    .option('-u, --username <username>', 'GitHub username')
    .option('-t, --token <token>', 'GitHub Personal Access Token (PAT)')
    .action(async (options) => {
      console.log(`\n${theme.highlight(' CoreNote Guided Setup')}`);
      console.log(theme.muted('====================================\n'));

      let username = options.username || config.get('githubUsername');
      let token = options.token;

      // If token is provided directly or via options
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
          console.log(theme.warning(`\n⚠ Device Flow is unconfigured (requires GITHUB_CLIENT_ID).`));
          console.log(theme.muted('Connecting via GitHub Username & Personal Access Token (PAT)...\n'));

          if (!username) {
            username = await promptInput(chalk.cyan('Enter your GitHub Username: '));
          }

          token = await promptInput(chalk.cyan('Paste your GitHub Personal Access Token (PAT): '));

          if (!token) {
            console.log(theme.error('❌ No GitHub token provided. Setup aborted.'));
            return;
          }
        }
      }

      // Step 3: Save Token in Keychain & Validate User Profile
      console.log(`\n${chalk.cyan('Step 3/4:')} Saving token to OS Keychain & validating credentials...`);
      await keyring.saveToken(token);

      try {
        const userInfo = await getAuthenticatedUser(token);
        username = userInfo.login;
        console.log(theme.success(`✔ Authenticated as GitHub user: ${theme.highlight(username)}\n`));
      } catch (userErr) {
        if (!username) {
          console.log(theme.error(`❌ Could not validate GitHub user: ${userErr.message}`));
          return;
        }
      }

      // Step 4: Provision Private GitHub Repository
      console.log(`${chalk.cyan('Step 4/4:')} Provisioning private "corenote-data" repository...`);
      try {
        const repoInfo = await ensurePrivateRepo(token, 'corenote-data');
        const finalUsername = repoInfo.username || username;

        if (repoInfo.created) {
          console.log(theme.success(`✔ Created new private repository: ${chalk.cyan(finalUsername + '/corenote-data')}`));
        } else {
          console.log(theme.success(`✔ Linked existing private repository: ${chalk.cyan(finalUsername + '/corenote-data')}`));
        }

        // Configure authenticated remote URL in ~/.corenote
        const authRemoteUrl = `https://${token}@github.com/${finalUsername}/corenote-data.git`;
        initRepo(authRemoteUrl);

        // Update ~/.corenoterc configuration
        config.set('githubUsername', finalUsername);
        config.set('repoUrl', `https://github.com/${finalUsername}/corenote-data`);
        config.set('lastSyncTime', new Date().toISOString());

        // Perform initial push sync
        push('init: setup corenote data repo');

        console.log(`\n${theme.success('🎉 CoreNote setup complete!')}`);
        console.log(`User:       ${theme.highlight(finalUsername)}`);
        console.log(`Repository: ${theme.highlight('https://github.com/' + finalUsername + '/corenote-data')}\n`);
      } catch (err) {
        // Fallback for manual remote setup if GitHub API fails
        if (username) {
          const authRemoteUrl = `https://${token}@github.com/${username}/corenote-data.git`;
          initRepo(authRemoteUrl);
          config.set('githubUsername', username);
          config.set('repoUrl', `https://github.com/${username}/corenote-data`);
          config.set('lastSyncTime', new Date().toISOString());
          push('init: setup corenote data repo');

          console.log(`\n${theme.success('🎉 CoreNote connected to repository!')}`);
          console.log(`User:       ${theme.highlight(username)}`);
          console.log(`Repository: ${theme.highlight('https://github.com/' + username + '/corenote-data')}\n`);
        } else {
          console.log(theme.error(`❌ Repository provisioning error: ${err.message}`));
        }
      }
    });
}

export default registerInitCommand;
