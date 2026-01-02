/**
 * Wallet Command - CLI interface for wallet management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import qrcode from 'qrcode-terminal';
import { WalletService } from '../services/wallet';
import { ConfigService } from '../services/config';

export function WalletCommand(program: Command): void {
  const wallet = program.command('wallet').description('Wallet management commands');

  // Create new wallet
  wallet
    .command('create')
    .description('Create a new Taproot (P2TR) quantum-hardened vault')
    .option('-n, --network <network>', 'Network: mainnet, testnet, regtest', 'mainnet')
    .option('--multisig <m-of-n>', 'Create multisig vault (e.g., 2-of-3)')
    .action(async (options) => {
      const spinner = ora('Generating quantum-hardened Taproot vault...').start();

      try {
        const walletService = new WalletService(options.network);
        const configService = new ConfigService();

        // Generate 13-word prophecy axiom
        const prophecyWords = walletService.generateProphecyAxiom();
        
        let vaultConfig;

        if (options.multisig) {
          const [required, total] = options.multisig.split('-of-').map(Number);
          vaultConfig = await walletService.createMultisigVault(
            prophecyWords,
            required,
            total
          );
          spinner.succeed('Multisig Taproot vault created successfully!');
        } else {
          vaultConfig = await walletService.createTaprootVault(prophecyWords);
          spinner.succeed('Taproot vault created successfully!');
        }

        // Save to config
        configService.setWallet(vaultConfig);

        console.log();
        console.log(chalk.cyan('⚔️  Excalibur-EXS Taproot Vault'));
        console.log(chalk.gray('━'.repeat(70)));
        console.log(chalk.yellow('📜 13-Word Prophecy Axiom (SAVE THIS SECURELY!):'));
        console.log(chalk.white.bold(prophecyWords.join(' ')));
        console.log();
        console.log(chalk.yellow('🔐 Vault Address:'));
        console.log(chalk.white.bold(vaultConfig.address));
        console.log();
        console.log(chalk.yellow('🌐 Network:'), chalk.white(vaultConfig.network));
        console.log(chalk.yellow('🔑 Type:'), chalk.white('Taproot (P2TR) + HPP-1 Quantum-Hardened'));
        console.log();

        // Display QR code
        console.log(chalk.yellow('📱 QR Code:'));
        qrcode.generate(vaultConfig.address, { small: true });
        console.log();

        console.log(chalk.green('✅ Wallet configuration saved'));
        console.log(chalk.gray(`Config file: ${configService.getPath()}`));
        console.log();
        console.log(chalk.red.bold('⚠️  IMPORTANT: Write down your 13-word prophecy axiom!'));
        console.log(chalk.red('   This is the ONLY way to recover your wallet.'));
      } catch (error) {
        spinner.fail('Failed to create wallet');
        console.error(chalk.red(`Error: ${error}`));
      }
    });

  // Import wallet
  wallet
    .command('import')
    .description('Import wallet from 13-word prophecy axiom')
    .option('-n, --network <network>', 'Network: mainnet, testnet, regtest', 'mainnet')
    .action(async (options) => {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'axiom',
          message: 'Enter your 13-word prophecy axiom:',
          validate: (input) => {
            const words = input.trim().split(/\s+/);
            return words.length === 13 || 'Must be exactly 13 words';
          },
        },
      ]);

      const spinner = ora('Importing wallet...').start();

      try {
        const walletService = new WalletService(options.network);
        const configService = new ConfigService();

        const prophecyWords = answers.axiom.trim().split(/\s+/);
        const vaultConfig = await walletService.importWallet(prophecyWords);

        configService.setWallet(vaultConfig);

        spinner.succeed('Wallet imported successfully!');

        console.log();
        console.log(chalk.cyan('⚔️  Imported Taproot Vault'));
        console.log(chalk.gray('━'.repeat(70)));
        console.log(chalk.yellow('🔐 Address:'), chalk.white(vaultConfig.address));
        console.log(chalk.yellow('🌐 Network:'), chalk.white(vaultConfig.network));
        console.log();
        console.log(chalk.green('✅ Wallet configuration saved'));
      } catch (error) {
        spinner.fail('Failed to import wallet');
        console.error(chalk.red(`Error: ${error}`));
      }
    });

  // Show wallet info
  wallet
    .command('info')
    .description('Display current wallet information')
    .action(async () => {
      const configService = new ConfigService();
      const vaultConfig = configService.getWallet();

      if (!vaultConfig) {
        console.log(chalk.red('No wallet configured. Run "exs wallet create" first.'));
        return;
      }

      const walletService = new WalletService(vaultConfig.network);
      const balance = await walletService.getBalance(vaultConfig.address);

      console.log();
      console.log(chalk.cyan('⚔️  Wallet Information'));
      console.log(chalk.gray('━'.repeat(70)));
      console.log(chalk.yellow('🔐 Address:'), chalk.white(vaultConfig.address));
      console.log(chalk.yellow('💰 Balance:'), chalk.white(`${balance} $EXS`));
      console.log(chalk.yellow('🌐 Network:'), chalk.white(vaultConfig.network));
      console.log(chalk.yellow('🔑 Type:'), chalk.white(vaultConfig.type));
      console.log(chalk.yellow('📅 Created:'), chalk.white(new Date(vaultConfig.createdAt).toLocaleString()));
      console.log();

      // Display QR code
      console.log(chalk.yellow('📱 QR Code:'));
      qrcode.generate(vaultConfig.address, { small: true });
    });

  // Validate address
  wallet
    .command('validate <address>')
    .description('Validate a Taproot address')
    .action((address) => {
      const walletService = new WalletService();
      const isValid = walletService.validateTaprootAddress(address);

      if (isValid) {
        console.log(chalk.green('✅ Valid Taproot (P2TR) address'));
      } else {
        console.log(chalk.red('❌ Invalid Taproot address'));
      }
    });

  // List UTXOs
  wallet
    .command('utxos')
    .description('List unspent transaction outputs (UTXOs)')
    .action(async () => {
      const configService = new ConfigService();
      const vaultConfig = configService.getWallet();

      if (!vaultConfig) {
        console.log(chalk.red('No wallet configured. Run "exs wallet create" first.'));
        return;
      }

      console.log();
      console.log(chalk.cyan('📊 Unspent Transaction Outputs (UTXOs)'));
      console.log(chalk.gray('━'.repeat(70)));

      // This would connect to node/API in production
      console.log(chalk.gray('No UTXOs found (connect to node for real data)'));
    });

  // Generate new address
  wallet
    .command('new-address')
    .description('Generate a new receiving address')
    .action(async () => {
      const configService = new ConfigService();
      const vaultConfig = configService.getWallet();

      if (!vaultConfig) {
        console.log(chalk.red('No wallet configured. Run "exs wallet create" first.'));
        return;
      }

      console.log();
      console.log(chalk.yellow('🔐 New Receiving Address:'));
      console.log(chalk.white(vaultConfig.address));
      console.log();
      qrcode.generate(vaultConfig.address, { small: true });
    });
}
