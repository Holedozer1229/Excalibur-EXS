// File: web/forge-ui/src/hooks/useMiningEngine.ts
// Purpose: React hook for mining engine state management
// Integrates with: minerService

import { useState, useEffect, useCallback } from 'react';
import { startMining, getMinerStats, checkMinerHealth, MinerType } from '../services/minerService';

export function useMiningEngine(minerType: MinerType) {
    const [mining, setMining] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch stats periodically
    useEffect(() => {
        const fetchStats = async () => {
            const data = await getMinerStats(minerType);
            setStats(data);
        };

        const fetchHealth = async () => {
            const data = await checkMinerHealth(minerType);
            setHealth(data);
        };

        fetchStats();
        fetchHealth();

        const interval = setInterval(() => {
            fetchStats();
            fetchHealth();
        }, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, [minerType]);

    const mine = useCallback(async (axiom: string) => {
        setMining(true);
        setError(null);

        try {
            const result = await startMining(minerType, axiom);
            // Refresh stats after mining
            const newStats = await getMinerStats(minerType);
            setStats(newStats);
            return result;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setMining(false);
        }
    }, [minerType]);

    return {
        mining,
        stats,
        health,
        error,
        mine
    };
}
