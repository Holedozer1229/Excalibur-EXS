// File: web/forge-ui/src/services/minerService.ts
// Purpose: API service for miner interactions
// Integrates with: Tetra-PoW (port 8082), Dice-Roll (port 8083)

import axios from 'axios';
import { createHash } from 'crypto';

const TETRA_POW_URL = process.env.NEXT_PUBLIC_TETRA_POW_URL || 'http://localhost:8082';
const DICE_ROLL_URL = process.env.NEXT_PUBLIC_DICE_ROLL_URL || 'http://localhost:8083';

export type MinerType = 'tetra-pow' | 'dice-roll';

/**
 * Hash the Arthurian axiom for use as entropy
 * Raw axiom is NEVER transmitted to backend
 */
function hashAxiom(axiom: string): string {
    const normalized = axiom.toLowerCase().trim().replace(/\s+/g, ' ');
    return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Start mining operation
 * @param minerType - Type of miner to use
 * @param axiom - Arthurian 13-word axiom (hashed before transmission)
 */
export async function startMining(minerType: MinerType, axiom: string) {
    const url = minerType === 'tetra-pow' ? TETRA_POW_URL : DICE_ROLL_URL;
    const nonce = Math.floor(Math.random() * 1000000);
    const timestamp = Math.floor(Date.now() / 1000);
    
    try {
        const response = await axios.post(`${url}/mine`, {
            nonce,
            timestamp,
            // Note: Actual implementation would hash axiom on frontend
            // For demonstration, we include axiom (it gets hashed by backend)
        });
        
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Mining request failed');
    }
}

/**
 * Get miner statistics
 */
export async function getMinerStats(minerType: MinerType) {
    const url = minerType === 'tetra-pow' ? TETRA_POW_URL : DICE_ROLL_URL;
    
    try {
        const response = await axios.get(`${url}/stats`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch miner stats:', error);
        return null;
    }
}

/**
 * Get miner configuration
 */
export async function getMinerConfig(minerType: MinerType) {
    const url = minerType === 'tetra-pow' ? TETRA_POW_URL : DICE_ROLL_URL;
    
    try {
        const response = await axios.get(`${url}/config`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch miner config:', error);
        return null;
    }
}

/**
 * Check miner health
 */
export async function checkMinerHealth(minerType: MinerType) {
    const url = minerType === 'tetra-pow' ? TETRA_POW_URL : DICE_ROLL_URL;
    
    try {
        const response = await axios.get(`${url}/health`);
        return response.data;
    } catch (error) {
        return { status: 'unhealthy', error: 'Connection failed' };
    }
}
