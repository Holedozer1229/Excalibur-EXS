/**
 * Utility functions for console application
 */

/**
 * Format $EXS amount with proper decimals
 */
export function formatEXS(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(8) + ' $EXS';
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format hash for display (truncate long hashes)
 */
export function formatHash(hash: string, length: number = 16): string {
  if (hash.length <= length) return hash;
  return `${hash.substring(0, length / 2)}...${hash.substring(hash.length - length / 2)}`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): string {
  if (total === 0) return '0.00';
  return ((part / total) * 100).toFixed(2);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate axiom format
 */
export function validateAxiom(axiom: string): boolean {
  const words = axiom.trim().split(/\s+/);
  return words.length === 13;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parse difficulty string to number
 */
export function parseDifficulty(difficulty: string): number {
  const num = parseInt(difficulty);
  if (isNaN(num) || num < 1 || num > 8) {
    throw new Error('Difficulty must be between 1 and 8');
  }
  return num;
}

/**
 * Validate network type
 */
export function validateNetwork(network: string): 'mainnet' | 'testnet' | 'regtest' {
  if (network !== 'mainnet' && network !== 'testnet' && network !== 'regtest') {
    throw new Error('Network must be mainnet, testnet, or regtest');
  }
  return network;
}
