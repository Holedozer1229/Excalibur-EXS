/**
 * Mining Command - CLI interface for mining operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { MiningService } from '../services/mining';
import { ConfigService } from '../services/config';

export function MiningCommand(program: Command): void {
  const mining = program.command('mine').description('Mining operations and management');

  // Start mining
  mining
    .command('start')
    .description('Start Tetra-PoW mining')
    .option('-a, --axiom <axiom>', '13-word prophecy axiom')
    .option('-d, --difficulty <level>', 'Difficulty level (1-8)', '4')
    .option('-w, --workers <count>', 'Number of worker threads', '0')
    .option('-o, --optimization <mode>', 'Optimization mode: power_save, balanced, performance, extreme', 'balanced')
    .action(async (options) => {
      let axiom = options.axiom;

      if (!axiom) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'axiom',
            message: 'Enter your 13-word prophecy axiom (or test data):',
            default: 'sword legend pull magic kingdom artist stone destroy forget fire steel honey question',
          },
        ]);
        axiom = answers.axiom;
      }

      const configService = new ConfigService();
      const miningConfig = {
        difficulty: parseInt(options.difficulty),
        workers: parseInt(options.workers),
        optimization: options.optimization,
        autoRestart: true,
      };

      configService.setMining(miningConfig);

      console.log();
      console.log(chalk.cyan('⚔️  Excalibur-EXS Ω′ Δ18 Tetra-PoW Miner'));
      console.log(chalk.gray('━'.repeat(70)));
      console.log(chalk.yellow('⚙️  Configuration:'));
      console.log(chalk.white(`   Difficulty: ${miningConfig.difficulty}`));
      console.log(chalk.white(`   Workers: ${miningConfig.workers || 'auto'}`));
      console.log(chalk.white(`   Optimization: ${miningConfig.optimization}`));
      console.log(chalk.gray('━'.repeat(70)));
      console.log();

      const spinner = ora('Mining in progress...').start();
      const miningService = new MiningService(miningConfig);

      try {
        const result = await miningService.mine(axiom);

        spinner.succeed('Block mined successfully!');

        console.log();
        console.log(chalk.green('✅ Mining Result:'));
        console.log(chalk.yellow('   Nonce:'), chalk.white(result.nonce));
        console.log(chalk.yellow('   Hash:'), chalk.white(result.hash));
        console.log(chalk.yellow('   Difficulty:'), chalk.white(result.difficulty));
        console.log(chalk.yellow('   Rounds:'), chalk.white(result.rounds));
        console.log(chalk.yellow('   Time Elapsed:'), chalk.white(`${(result.timeElapsed / 1000).toFixed(2)}s`));
        console.log(chalk.yellow('   Hash Rate:'), chalk.white(`${result.hashRate.toFixed(2)} H/s`));
        console.log();
        console.log(chalk.cyan('💰 Block Reward:'), chalk.white('50 $EXS'));
        console.log(chalk.cyan('🏛️  Treasury Allocation:'), chalk.white('7.5 $EXS (15%)'));
        console.log(chalk.cyan('👤 Miner Reward:'), chalk.white('42.5 $EXS (85%)'));
      } catch (error) {
        spinner.fail('Mining failed');
        console.error(chalk.red(`Error: ${error}`));
      }
    });

  // Benchmark
  mining
    .command('benchmark')
    .description('Benchmark mining performance')
    .option('-r, --rounds <count>', 'Number of benchmark rounds', '100')
    .action(async (options) => {
      const rounds = parseInt(options.rounds);
      const miningService = new MiningService();

      console.log();
      console.log(chalk.cyan('⚡ Tetra-PoW Performance Benchmark'));
      console.log(chalk.gray('━'.repeat(70)));
      console.log(chalk.yellow(`Running ${rounds} iterations...`));
      console.log();

      const spinner = ora('Benchmarking...').start();

      try {
        const results = await miningService.benchmark(rounds);

        spinner.succeed('Benchmark complete!');

        console.log();
        console.log(chalk.green('📊 Results:'));
        console.log(chalk.yellow('   Average Hash Rate:'), chalk.white(`${results.avgHashRate.toFixed(2)} H/s`));
        console.log(chalk.yellow('   Average Time per Round:'), chalk.white(`${results.avgTime.toFixed(2)} ms`));
        console.log();

        // Performance rating
        const rating = results.avgHashRate > 100 ? '🚀 Excellent' :
                      results.avgHashRate > 50 ? '⚡ Good' :
                      results.avgHashRate > 10 ? '✅ Fair' : '⚠️  Slow';

        console.log(chalk.cyan('Performance Rating:'), chalk.white(rating));
      } catch (error) {
        spinner.fail('Benchmark failed');
        console.error(chalk.red(`Error: ${error}`));
      }
    });

  // Mining stats
  mining
    .command('stats')
    .description('Display mining statistics')
    .action(async () => {
      const configService = new ConfigService();
      const miningConfig = configService.getMining();

      if (!miningConfig) {
        console.log(chalk.yellow('No mining configuration found.'));
        console.log(chalk.gray('Run "exs mine start" to configure mining.'));
        return;
      }

      console.log();
      console.log(chalk.cyan('📊 Mining Statistics'));
      console.log(chalk.gray('━'.repeat(70)));
      console.log(chalk.yellow('⚙️  Configuration:'));
      console.log(chalk.white(`   Difficulty: ${miningConfig.difficulty}`));
      console.log(chalk.white(`   Workers: ${miningConfig.workers || 'auto'}`));
      console.log(chalk.white(`   Optimization: ${miningConfig.optimization}`));
      console.log(chalk.white(`   Auto-Restart: ${miningConfig.autoRestart ? 'Yes' : 'No'}`));
      console.log();

      const miningService = new MiningService(miningConfig);
      const stats = await miningService.getMiningStats();

      console.log(chalk.yellow('📈 Status:'), chalk.white(stats.status));
      console.log();
    });

  // Hardware info
  mining
    .command('hwinfo')
    .description('Display hardware information and capabilities')
    .action(() => {
      console.log();
      console.log(chalk.cyan('🖥️  Hardware Information'));
      console.log(chalk.gray('━'.repeat(70)));
      
      const os = require('os');
      const cpus = os.cpus();

      console.log(chalk.yellow('CPU:'), chalk.white(cpus[0].model));
      console.log(chalk.yellow('Cores:'), chalk.white(cpus.length));
      console.log(chalk.yellow('Architecture:'), chalk.white(os.arch()));
      console.log(chalk.yellow('Platform:'), chalk.white(os.platform()));
      console.log(chalk.yellow('Total Memory:'), chalk.white(`${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`));
      console.log(chalk.yellow('Free Memory:'), chalk.white(`${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`));
      console.log();

      console.log(chalk.cyan('⚙️  Optimization Modes:'));
      const table = new Table({
        head: ['Mode', 'Description', 'Use Case'],
        colWidths: [15, 30, 25],
      });

      table.push(
        ['power_save', 'Low power consumption', 'Laptops, low-end systems'],
        ['balanced', 'Balanced performance', 'General purpose mining'],
        ['performance', 'High performance', 'Dedicated mining rigs'],
        ['extreme', 'Maximum performance', 'High-end systems only']
      );

      console.log(table.toString());
      console.log();
    });

  // Stop mining
  mining
    .command('stop')
    .description('Stop active mining process')
    .action(() => {
      const miningService = new MiningService();
      miningService.stopMining();
      console.log(chalk.green('✅ Mining stopped'));
    });
}
