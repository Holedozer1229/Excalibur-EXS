/**
 * Config Command - CLI interface for configuration management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigService } from '../services/config';
import Table from 'cli-table3';

export function ConfigCommand(program: Command): void {
  const config = program.command('config').description('Configuration management');

  // Show configuration
  config
    .command('show')
    .description('Display current configuration')
    .action(() => {
      const configService = new ConfigService();
      const allConfig = configService.getAll();

      console.log();
      console.log(chalk.cyan('⚙️  Current Configuration'));
      console.log(chalk.gray('━'.repeat(70)));
      console.log(chalk.white(JSON.stringify(allConfig, null, 2)));
      console.log();
      console.log(chalk.gray(`Config file: ${configService.getPath()}`));
      console.log();
    });

  // Set configuration value
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key, value) => {
      const configService = new ConfigService();
      
      // Parse value if it's JSON
      let parsedValue = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Keep as string if not valid JSON
      }

      configService.set(key as any, parsedValue);
      console.log(chalk.green(`✅ Set ${key} = ${value}`));
    });

  // Get configuration value
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action((key) => {
      const configService = new ConfigService();
      const value = configService.get(key as any);

      if (value !== undefined) {
        console.log(chalk.white(JSON.stringify(value, null, 2)));
      } else {
        console.log(chalk.yellow(`Key "${key}" not found`));
      }
    });

  // Clear configuration
  config
    .command('clear')
    .description('Clear all configuration')
    .action(() => {
      const configService = new ConfigService();
      configService.clear();
      console.log(chalk.green('✅ Configuration cleared'));
    });

  // Export configuration
  config
    .command('export')
    .description('Export configuration to JSON')
    .option('-o, --output <file>', 'Output file path')
    .action((options) => {
      const configService = new ConfigService();
      const json = configService.export();

      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, json);
        console.log(chalk.green(`✅ Configuration exported to ${options.output}`));
      } else {
        console.log(json);
      }
    });

  // Import configuration
  config
    .command('import <file>')
    .description('Import configuration from JSON file')
    .action((file) => {
      const fs = require('fs');
      const configService = new ConfigService();

      try {
        const json = fs.readFileSync(file, 'utf-8');
        configService.import(json);
        console.log(chalk.green(`✅ Configuration imported from ${file}`));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
      }
    });

  // Show config path
  config
    .command('path')
    .description('Display configuration file path')
    .action(() => {
      const configService = new ConfigService();
      console.log(configService.getPath());
    });
}
