// File: web/forge-ui/src/services/rosettaService.ts
// Purpose: Rosetta API service for block/transaction construction
// Integrates with: Rosetta API (port 8081)

import axios from 'axios';

const ROSETTA_URL = process.env.NEXT_PUBLIC_ROSETTA_URL || 'http://localhost:8081';

/**
 * Fetch treasury mini-outputs and CLTV schedule
 */
export async function fetchTreasury() {
    try {
        const response = await axios.get(`${ROSETTA_URL}/account/balance`, {
            params: {
                account_type: 'treasury'
            }
        });
        
        return response.data.mini_outputs || [];
    } catch (error) {
        console.error('Failed to fetch treasury:', error);
        return [];
    }
}

/**
 * Get account balance via Rosetta
 */
export async function getAccountBalance(address: string) {
    try {
        const response = await axios.post(`${ROSETTA_URL}/account/balance`, {
            network_identifier: {
                blockchain: 'excalibur-exs',
                network: 'mainnet'
            },
            account_identifier: {
                address
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Failed to fetch account balance:', error);
        return null;
    }
}

/**
 * Construct a transaction via Rosetta
 */
export async function constructTransaction(from: string, to: string, amount: string) {
    try {
        const response = await axios.post(`${ROSETTA_URL}/construction/preprocess`, {
            network_identifier: {
                blockchain: 'excalibur-exs',
                network: 'mainnet'
            },
            operations: [
                {
                    operation_identifier: { index: 0 },
                    type: 'transfer',
                    account: { address: from },
                    amount: {
                        value: `-${amount}`,
                        currency: { symbol: 'EXS', decimals: 8 }
                    }
                },
                {
                    operation_identifier: { index: 1 },
                    type: 'transfer',
                    account: { address: to },
                    amount: {
                        value: amount,
                        currency: { symbol: 'EXS', decimals: 8 }
                    }
                }
            ]
        });
        
        return response.data;
    } catch (error) {
        console.error('Failed to construct transaction:', error);
        return null;
    }
}

/**
 * Get network status via Rosetta
 */
export async function getNetworkStatus() {
    try {
        const response = await axios.post(`${ROSETTA_URL}/network/status`, {
            network_identifier: {
                blockchain: 'excalibur-exs',
                network: 'mainnet'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Failed to fetch network status:', error);
        return null;
    }
}
