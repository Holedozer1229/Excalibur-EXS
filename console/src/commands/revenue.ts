/**
 * Revenue Command - CLI interface for income generation and tracking
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { RevenueService } from '../services/revenue';
import { ConfigService } from '../services/config';

export function RevenueCommand(program: Command): void {
  const revenue = program.command('revenue').description('Income generation and revenue tracking');

  // Show revenue stats
  revenue
    .command('stats')
    .description('Display comprehensive revenue statistics')
    .action(async () => {
      const spinner = ora('Fetching revenue statistics...').start();
      const revenueService = new RevenueService();

      try {
        const stats = await revenueService.getRevenueStats();
        spinner.succeed('Revenue statistics loaded');

        console.log();
        console.log(chalk.cyan('💰 Revenue Statistics'));
        console.log(chalk.gray('━'.repeat(70)));
        console.log(chalk.yellow('Total Revenue Generated:'), chalk.white(stats.totalRevenueGenerated));
        console.log(chalk.yellow('Treasury Collected:'), chalk.white(stats.totalTreasuryCollected));
        console.log(chalk.yellow('User Rewards Distributed:'), chalk.white(stats.totalUserRewards));
        console.log(chalk.yellow('Active Streams:'), chalk.white(`${stats.activeStreams}/${stats.totalStreams}`));
        console.log();

        console.log(chalk.cyan('📊 Revenue Streams:'));
        const table = new Table({
          head: ['Stream', 'APR', 'User Share', 'Status'],
          colWidths: [25, 12, 12, 10],
        });

        Object.entries(stats.streams).forEach(([name, stream]) => {
          table.push([
            stream.description.substring(0, 23),
            stream.estimatedApr,
            `${(stream.userShare * 100).toFixed(1)}%`,
            stream.status === 'active' ? chalk.green('●') : chalk.red('●'),
          ]);
        });

        console.log(table.toString());
        console.log();
      } catch (error) {
        spinner.fail('Failed to fetch revenue statistics');
        console.error(chalk.red(`Error: ${error}`));
      }
    });

  // Show available streams
  revenue
    .command('streams')
    .description('List all available revenue streams')
    .action(() => {
      const revenueService = new RevenueService();
      const streams = revenueService.getRevenueStreams();

      console.log();
      console.log(chalk.cyan('💎 Available Revenue Streams'));
      console.log(chalk.gray('━'.repeat(70)));

      streams.forEach((stream, index) => {
        console.log();
        console.log(chalk.yellow(`${index + 1}. ${stream.name}`));
        console.log(chalk.white(`   ${stream.description}`));
        console.log(chalk.gray(`   Estimated APR: ${stream.estimatedApr}`));
        console.log(chalk.gray(`   User Share: ${(stream.userShare * 100).toFixed(1)}%`));
        console.log(chalk.gray(`   Treasury Share: ${(stream.treasuryShare * 100).toFixed(1)}%`));
        console.log(chalk.gray(`   Status: ${stream.status}`));
      });

      console.log();
    });

  // Calculate user rewards
  revenue
    .command('calculate')
    .description('Calculate potential user rewards')
    .option('-s, --stake <amount>', 'Your stake in $EXS')
    .option('-t, --total-stake <amount>', 'Total staked across all users')
    .option('-f, --forges <count>', 'Number of forges completed', '0')
    .option('-m, --months <count>', 'Months holding $EXS', '0')
    .option('--lp', 'Liquidity provider status', false)
    .action(async (options) => {
      const revenueService = new RevenueService();

      // Interactive prompts if options not provided
      if (!options.stake || !options.totalStake) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'stake',
            message: 'Your stake in $EXS:',
            default: '1000',
            when: () => !options.stake,
          },
          {
            type: 'input',
            name: 'totalStake',
            message: 'Total staked across all users:',
            default: '100000',
            when: () => !options.totalStake,
          },
          {
            type: 'input',
            name: 'forges',
            message: 'Number of forges completed:',
            default: '0',
          },
          {
            type: 'input',
            name: 'months',
            message: 'Months holding $EXS:',
            default: '0',
          },
          {
            type: 'confirm',
            name: 'lp',
            message: 'Are you a liquidity provider?',
            default: false,
          },
        ]);

        options = { ...options, ...answers };
      }

      const spinner = ora('Calculating rewards...').start();

      try {
        const reward = await revenueService.calculateUserRewards({
          userStake: options.stake || '0',
          totalStaked: options.totalStake || '1',
          forgeCount: parseInt(options.forges),
          holdingMonths: parseInt(options.months),
          isLp: options.lp,
        });

        spinner.succeed('Rewards calculated');

        console.log();
        console.log(chalk.cyan('💰 Reward Calculation'));
        console.log(chalk.gray('━'.repeat(70)));
        console.log(chalk.yellow('Your Stake:'), chalk.white(`${options.stake} $EXS`));
        console.log(chalk.yellow('Total Staked:'), chalk.white(`${options.totalStake} $EXS`));
        console.log(chalk.yellow('Base Share:'), chalk.white(`${((parseFloat(options.stake) / parseFloat(options.totalStake)) * 100).toFixed(4)}%`));
        console.log();
        console.log(chalk.cyan('🎁 Bonus Multipliers:'));
        
        let totalMultiplier = 1.0;
        const forges = parseInt(options.forges);
        const months = parseInt(options.months);
        
        if (months >= 24) {
          console.log(chalk.white('   Long-term holder (24+ months): 1.5x'));
          totalMultiplier *= 1.5;
        } else if (months >= 12) {
          console.log(chalk.white('   Long-term holder (12+ months): 1.25x'));
          totalMultiplier *= 1.25;
        } else if (months >= 6) {
          console.log(chalk.white('   Long-term holder (6+ months): 1.1x'));
          totalMultiplier *= 1.1;
        }

        if (forges >= 100) {
          console.log(chalk.white('   Active forger (100+ forges): 1.3x'));
          totalMultiplier *= 1.3;
        } else if (forges >= 50) {
          console.log(chalk.white('   Active forger (50+ forges): 1.15x'));
          totalMultiplier *= 1.15;
        } else if (forges >= 10) {
          console.log(chalk.white('   Active forger (10+ forges): 1.05x'));
          totalMultiplier *= 1.05;
        }

        if (options.lp) {
          console.log(chalk.white('   Liquidity provider: 1.2x'));
          totalMultiplier *= 1.2;
        }

        console.log();
        console.log(chalk.yellow('Total Multiplier:'), chalk.white.bold(`${totalMultiplier.toFixed(2)}x`));
        console.log(chalk.yellow('Weighted Share:'), chalk.white.bold(reward));
        console.log();
      } catch (error) {
        spinner.fail('Failed to calculate rewards');
        console.error(chalk.red(`Error: ${error}`));
      }
    });

  // Estimate potential income
  revenue
    .command('estimate')
    .description('Estimate potential income based on parameters')
    .option('-s, --stake <amount>', 'Your stake in $EXS', '1000')
    .option('-h, --hashrate <rate>', 'Mining hash rate (H/s)', '100')
    .option('-d, --days <count>', 'Number of days active', '30')
    .action(async (options) => {
      const revenueService = new RevenueService();

      const estimate = revenueService.estimatePotentialIncome(
        parseFloat(options.stake),
        parseFloat(options.hashrate),
        parseInt(options.days)
      );

      console.log();
      console.log(chalk.cyan('📈 Income Estimation'));
      console.log(chalk.gray('━'.repeat(70)));
      console.log(chalk.yellow('Parameters:'));
      console.log(chalk.white(`   Stake: ${options.stake} $EXS`));
      console.log(chalk.white(`   Mining Hash Rate: ${options.hashrate} H/s`));
      console.log(chalk.white(`   Days Active: ${options.days}`));
      console.log(chalk.white(`   Staking APY: ${estimate.parameters.stakingApy}`));
      console.log(chalk.white(`   Revenue APY: ${estimate.parameters.revenueApy}`));
      console.log();
      console.log(chalk.cyan('💰 Daily Income:'));
      console.log(chalk.white(`   Mining: ${estimate.daily.mining} $EXS`));
      console.log(chalk.white(`   Staking: ${estimate.daily.staking} $EXS`));
      console.log(chalk.white(`   Revenue Share: ${estimate.daily.revenueShare} $EXS`));
      console.log(chalk.white.bold(`   Total: ${estimate.daily.total} $EXS`));
      console.log();
      console.log(chalk.cyan('📊 Projected Income:'));
      console.log(chalk.white(`   ${options.days} days: `), chalk.white.bold(`${estimate.projected.income} $EXS`));
      console.log();
    });

  // Show user income summary
  revenue
    .command('summary')
    .description('Show income summary for your wallet')
    .action(async () => {
      const configService = new ConfigService();
      const wallet = configService.getWallet();

      if (!wallet) {
        console.log(chalk.red('No wallet configured. Run "exs wallet create" first.'));
        return;
      }

      const spinner = ora('Fetching income summary...').start();
      const revenueService = new RevenueService();

      try {
        const summary = await revenueService.getIncomeSummary(wallet.address);
        spinner.succeed('Income summary loaded');

        console.log();
        console.log(chalk.cyan('💎 Income Summary'));
        console.log(chalk.gray('━'.repeat(70)));
        console.log(chalk.yellow('Address:'), chalk.white(summary.address));
        console.log(chalk.yellow('Total Earned:'), chalk.white.bold(`${summary.totalEarned} $EXS`));
        console.log();
        console.log(chalk.cyan('📊 Breakdown:'));
        console.log(chalk.white(`   Mining Rewards: ${summary.miningRewards} $EXS`));
        console.log(chalk.white(`   Staking Rewards: ${summary.stakingRewards} $EXS`));
        console.log(chalk.white(`   Revenue Share: ${summary.revenueShare} $EXS`));
        console.log();
        console.log(chalk.gray(`Last Updated: ${new Date(summary.lastUpdate).toLocaleString()}`));
        console.log();
      } catch (error) {
        spinner.fail('Failed to fetch income summary');
        console.error(chalk.red(`Error: ${error}`));
      }
    });
}
