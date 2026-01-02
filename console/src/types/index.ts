/**
 * Type definitions for Excalibur-EXS Console
 */

export interface WalletConfig {
  address: string;
  publicKey: string;
  network: 'mainnet' | 'testnet' | 'regtest';
  type: 'taproot' | 'legacy' | 'segwit';
  createdAt: string;
}

export interface MiningConfig {
  difficulty: number;
  workers: number;
  optimization: 'power_save' | 'balanced' | 'performance' | 'extreme';
  autoRestart: boolean;
}

export interface RevenueStream {
  name: string;
  description: string;
  treasuryShare: number;
  userShare: number;
  operationalShare: number;
  estimatedApr: string;
  status: 'active' | 'inactive';
}

export interface MiningResult {
  success: boolean;
  nonce: number;
  hash: string;
  difficulty: number;
  rounds: number;
  timeElapsed: number;
  hashRate: number;
}

export interface RevenueStats {
  totalRevenueGenerated: string;
  totalTreasuryCollected: string;
  totalUserRewards: string;
  activeStreams: number;
  totalStreams: number;
  streams: Record<string, RevenueStream>;
}

export interface UserRewardParams {
  userStake: string;
  totalStaked: string;
  forgeCount: number;
  holdingMonths: number;
  isLp: boolean;
}

export interface UTXOInfo {
  txid: string;
  vout: number;
  amount: string;
  confirmations: number;
  address: string;
}

export interface WalletPerformance {
  totalBalance: string;
  availableBalance: string;
  lockedBalance: string;
  utxoCount: number;
  totalForges: number;
  totalRewards: string;
  apy: string;
}

export interface Config {
  wallet?: WalletConfig;
  mining?: MiningConfig;
  apiEndpoint?: string;
  network?: string;
}
