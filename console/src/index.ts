#!/usr/bin/env node
/**
 * Excalibur-EXS Console Application
 * Unified command-line interface for the Excalibur Anomaly Protocol
 * 
 * Lead Architect: Travis D Jones (holedozer@icloud.com)
 * License: BSD-3-Clause
 */

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import updateNotifier from 'update-notifier';
import { WalletCommand } from './commands/wallet';
import { MiningCommand } from './commands/mining';
import { RevenueCommand } from './commands/revenue';
import { ConfigCommand } from './commands/config';
import { InteractiveCommand } from './commands/interactive';
import packageJson from '../package.json';

// Check for updates
const notifier = updateNotifier({ pkg: packageJson });
notifier.notify();

// Display banner
console.log(
  chalk.cyan(
    figlet.textSync('Excalibur-EXS', {
      font: 'Standard',
      horizontalLayout: 'default',
    })
  )
);

console.log(chalk.gray('⚔️  The Excalibur Anomaly Protocol'));
console.log(chalk.gray('━'.repeat(70)));
console.log();

// Create program
const program = new Command();

program
  .name('exs')
  .description('Excalibur-EXS Console Application - Unified interface for mining, wallet management, and income generation')
  .version(packageJson.version)
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-c, --config <path>', 'Configuration file path');

// Register commands
WalletCommand(program);
MiningCommand(program);
RevenueCommand(program);
ConfigCommand(program);
InteractiveCommand(program);

// Help command
program
  .command('help [command]')
  .description('Display help information')
  .action((command) => {
    if (command) {
      program.commands.find((cmd) => cmd.name() === command)?.help();
    } else {
      program.help();
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.yellow('💡 Tip: Run "exs interactive" for guided experience'));
  console.log(chalk.yellow('💡 Tip: Run "exs help" to see all commands'));
  console.log();
  program.outputHelp();
}
