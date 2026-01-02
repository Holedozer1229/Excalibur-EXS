/**
 * Configuration Service - Manages application settings
 */

import { Config, WalletConfig, MiningConfig } from '../types';

// Use dynamic import for ESM module
const Conf = require('conf');

export class ConfigService {
  private config: any;

  constructor(configName: string = 'excalibur-exs') {
    this.config = new Conf({
      projectName: configName,
      defaults: {
        network: 'mainnet',
        apiEndpoint: 'http://localhost:5000',
      },
    });
  }

  /**
   * Get configuration value
   */
  get<K extends keyof Config>(key: K): Config[K] | undefined {
    return this.config.get(key);
  }

  /**
   * Set configuration value
   */
  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config.set(key, value);
  }

  /**
   * Get all configuration
   */
  getAll(): Config {
    return this.config.store;
  }

  /**
   * Set wallet configuration
   */
  setWallet(wallet: WalletConfig): void {
    this.config.set('wallet', wallet);
  }

  /**
   * Get wallet configuration
   */
  getWallet(): WalletConfig | undefined {
    return this.config.get('wallet');
  }

  /**
   * Set mining configuration
   */
  setMining(mining: MiningConfig): void {
    this.config.set('mining', mining);
  }

  /**
   * Get mining configuration
   */
  getMining(): MiningConfig | undefined {
    return this.config.get('mining');
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.config.clear();
  }

  /**
   * Get configuration file path
   */
  getPath(): string {
    return this.config.path;
  }

  /**
   * Check if wallet is configured
   */
  hasWallet(): boolean {
    return this.config.has('wallet');
  }

  /**
   * Export configuration to JSON
   */
  export(): string {
    return JSON.stringify(this.config.store, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  import(json: string): void {
    const data = JSON.parse(json);
    Object.keys(data).forEach((key) => {
      this.config.set(key as keyof Config, data[key]);
    });
  }
}
