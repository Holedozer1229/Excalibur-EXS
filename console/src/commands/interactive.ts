/**
 * Interactive Command - Guided interactive experience
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { WalletService } from '../services/wallet';
import { MiningService } from '../services/mining';
import { RevenueService } from '../services/revenue';
import { ConfigService } from '../services/config';

export function InteractiveCommand(program: Command): void {
  program
    .command('interactive')
    .alias('i')
    .description('Launch interactive guided experience')
    .action(async () => {
      console.log();
      console.log(chalk.cyan.bold('⚔️  Welcome to Excalibur-EXS Interactive Mode'));
      console.log(chalk.gray('━'.repeat(70)));
      console.log();

      const configService = new ConfigService();

      // Main menu loop
      let exit = false;

      while (!exit) {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: '🔐 Wallet Management', value: 'wallet' },
              { name: '⛏️  Mining Operations', value: 'mining' },
              { name: '💰 Income & Revenue', value: 'revenue' },
              { name: '⚙️  Configuration', value: 'config' },
              { name: '❌ Exit', value: 'exit' },
            ],
          },
        ]);

        switch (action) {
          case 'wallet':
            await walletMenu(configService);
            break;
          case 'mining':
            await miningMenu(configService);
            break;
          case 'revenue':
            await revenueMenu(configService);
            break;
          case 'config':
            await configMenu(configService);
            break;
          case 'exit':
            exit = true;
            console.log();
            console.log(chalk.cyan('⚔️  May the protocol be with you!'));
            console.log();
            break;
        }
      }
    });
}

async function walletMenu(configService: ConfigService): Promise<void> {
  const { walletAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'walletAction',
      message: 'Wallet Options:',
      choices: [
        { name: '➕ Create New Wallet', value: 'create' },
        { name: '📥 Import Wallet', value: 'import' },
        { name: '📊 Show Wallet Info', value: 'info' },
        { name: '🔙 Back', value: 'back' },
      ],
    },
  ]);

  if (walletAction === 'back') return;

  const walletService = new WalletService('mainnet');

  switch (walletAction) {
    case 'create': {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Create a new quantum-hardened Taproot vault?',
          default: true,
        },
      ]);

      if (confirm) {
        console.log(chalk.yellow('Generating vault...'));
        const prophecyWords = walletService.generateProphecyAxiom();
        const vault = await walletService.createTaprootVault(prophecyWords);
        configService.setWallet(vault);

        console.log();
        console.log(chalk.green('✅ Vault created successfully!'));
        console.log(chalk.yellow('📜 Prophecy Axiom (SAVE THIS):'));
        console.log(chalk.white.bold(prophecyWords.join(' ')));
        console.log();
        console.log(chalk.yellow('🔐 Address:'), chalk.white(vault.address));
        console.log();
      }
      break;
    }

    case 'import': {
      const { axiom } = await inquirer.prompt([
        {
          type: 'input',
          name: 'axiom',
          message: 'Enter your 13-word prophecy axiom:',
        },
      ]);

      const prophecyWords = axiom.trim().split(/\s+/);
      if (prophecyWords.length !== 13) {
        console.log(chalk.red('❌ Must be exactly 13 words'));
        break;
      }

      const vault = await walletService.importWallet(prophecyWords);
      configService.setWallet(vault);
      console.log(chalk.green('✅ Wallet imported successfully!'));
      console.log(chalk.yellow('Address:'), chalk.white(vault.address));
      break;
    }

    case 'info': {
      const vault = configService.getWallet();
      if (!vault) {
        console.log(chalk.red('No wallet configured'));
        break;
      }

      console.log();
      console.log(chalk.cyan('📊 Wallet Information'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(chalk.yellow('Address:'), chalk.white(vault.address));
      console.log(chalk.yellow('Network:'), chalk.white(vault.network));
      console.log(chalk.yellow('Type:'), chalk.white(vault.type));
      console.log();
      break;
    }
  }
}

async function miningMenu(configService: ConfigService): Promise<void> {
  const { miningAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'miningAction',
      message: 'Mining Options:',
      choices: [
        { name: '▶️  Start Mining', value: 'start' },
        { name: '⚡ Benchmark', value: 'benchmark' },
        { name: '📊 Show Stats', value: 'stats' },
        { name: '🔙 Back', value: 'back' },
      ],
    },
  ]);

  if (miningAction === 'back') return;

  switch (miningAction) {
    case 'start': {
      const { axiom, difficulty } = await inquirer.prompt([
        {
          type: 'input',
          name: 'axiom',
          message: 'Enter mining axiom:',
          default: 'sword legend pull magic kingdom artist stone destroy forget fire steel honey question',
        },
        {
          type: 'list',
          name: 'difficulty',
          message: 'Select difficulty:',
          choices: [
            { name: 'Easy (1)', value: 1 },
            { name: 'Normal (4)', value: 4 },
            { name: 'Hard (6)', value: 6 },
            { name: 'Expert (8)', value: 8 },
          ],
        },
      ]);

      console.log(chalk.yellow('⛏️  Mining started...'));
      const miningService = new MiningService({ difficulty });

      try {
        const result = await miningService.mine(axiom);
        console.log(chalk.green('✅ Block mined!'));
        console.log(chalk.yellow('Nonce:'), result.nonce);
        console.log(chalk.yellow('Hash:'), result.hash.substring(0, 32) + '...');
        console.log(chalk.yellow('Time:'), `${(result.timeElapsed / 1000).toFixed(2)}s`);
        console.log(chalk.yellow('Hash Rate:'), `${result.hashRate.toFixed(2)} H/s`);
      } catch (error) {
        console.log(chalk.red('❌ Mining failed'));
      }
      break;
    }

    case 'benchmark': {
      console.log(chalk.yellow('⚡ Running benchmark...'));
      const miningService = new MiningService();
      const results = await miningService.benchmark(50);
      console.log(chalk.green('✅ Benchmark complete!'));
      console.log(chalk.yellow('Avg Hash Rate:'), `${results.avgHashRate.toFixed(2)} H/s`);
      break;
    }

    case 'stats': {
      const miningConfig = configService.getMining();
      if (!miningConfig) {
        console.log(chalk.yellow('No mining configuration'));
        break;
      }

      console.log();
      console.log(chalk.cyan('📊 Mining Stats'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(chalk.yellow('Difficulty:'), miningConfig.difficulty);
      console.log(chalk.yellow('Workers:'), miningConfig.workers || 'auto');
      console.log(chalk.yellow('Optimization:'), miningConfig.optimization);
      console.log();
      break;
    }
  }
}

async function revenueMenu(configService: ConfigService): Promise<void> {
  const { revenueAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'revenueAction',
      message: 'Revenue Options:',
      choices: [
        { name: '📊 Show Statistics', value: 'stats' },
        { name: '💎 List Streams', value: 'streams' },
        { name: '💰 Calculate Rewards', value: 'calculate' },
        { name: '📈 Estimate Income', value: 'estimate' },
        { name: '🔙 Back', value: 'back' },
      ],
    },
  ]);

  if (revenueAction === 'back') return;

  const revenueService = new RevenueService();

  switch (revenueAction) {
    case 'stats': {
      const stats = await revenueService.getRevenueStats();
      console.log();
      console.log(chalk.cyan('💰 Revenue Statistics'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(chalk.yellow('Active Streams:'), `${stats.activeStreams}/${stats.totalStreams}`);
      console.log();
      break;
    }

    case 'streams': {
      const streams = revenueService.getRevenueStreams();
      console.log();
      console.log(chalk.cyan('💎 Revenue Streams'));
      console.log(chalk.gray('━'.repeat(50)));
      streams.slice(0, 5).forEach((stream, i) => {
        console.log(chalk.yellow(`${i + 1}. ${stream.name}`));
        console.log(chalk.gray(`   APR: ${stream.estimatedApr}`));
      });
      console.log();
      break;
    }

    case 'calculate': {
      const { stake, totalStake } = await inquirer.prompt([
        {
          type: 'input',
          name: 'stake',
          message: 'Your stake ($EXS):',
          default: '1000',
        },
        {
          type: 'input',
          name: 'totalStake',
          message: 'Total staked ($EXS):',
          default: '100000',
        },
      ]);

      const reward = await revenueService.calculateUserRewards({
        userStake: stake,
        totalStaked: totalStake,
        forgeCount: 0,
        holdingMonths: 0,
        isLp: false,
      });

      console.log(chalk.green('✅ Your weighted share:'), chalk.white.bold(reward));
      break;
    }

    case 'estimate': {
      const { stake, hashrate, days } = await inquirer.prompt([
        {
          type: 'input',
          name: 'stake',
          message: 'Your stake ($EXS):',
          default: '1000',
        },
        {
          type: 'input',
          name: 'hashrate',
          message: 'Hash rate (H/s):',
          default: '100',
        },
        {
          type: 'input',
          name: 'days',
          message: 'Days active:',
          default: '30',
        },
      ]);

      const estimate = revenueService.estimatePotentialIncome(
        parseFloat(stake),
        parseFloat(hashrate),
        parseInt(days)
      );

      console.log();
      console.log(chalk.cyan('📈 Income Estimate'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(chalk.yellow('Daily Total:'), chalk.white.bold(`${estimate.daily.total} $EXS`));
      console.log(chalk.yellow(`${days}-day Projection:`), chalk.white.bold(`${estimate.projected.income} $EXS`));
      console.log();
      break;
    }
  }
}

async function configMenu(configService: ConfigService): Promise<void> {
  const { configAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'configAction',
      message: 'Configuration Options:',
      choices: [
        { name: '📊 Show Config', value: 'show' },
        { name: '🗑️  Clear Config', value: 'clear' },
        { name: '🔙 Back', value: 'back' },
      ],
    },
  ]);

  if (configAction === 'back') return;

  switch (configAction) {
    case 'show': {
      const config = configService.getAll();
      console.log();
      console.log(chalk.white(JSON.stringify(config, null, 2)));
      console.log();
      break;
    }

    case 'clear': {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Clear all configuration?',
          default: false,
        },
      ]);

      if (confirm) {
        configService.clear();
        console.log(chalk.green('✅ Configuration cleared'));
      }
      break;
    }
  }
}
