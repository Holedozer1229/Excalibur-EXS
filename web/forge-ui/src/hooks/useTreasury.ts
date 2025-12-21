// File: web/forge-ui/src/hooks/useTreasury.ts
// Purpose: React hook for treasury data management
// Integrates with: Treasury API

import { useState, useEffect } from 'react';
import axios from 'axios';

const TREASURY_URL = process.env.NEXT_PUBLIC_TREASURY_URL || 'http://localhost:8080';

export function useTreasury() {
    const [stats, setStats] = useState<any>(null);
    const [miniOutputs, setMiniOutputs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, outputsRes] = await Promise.all([
                    axios.get(`${TREASURY_URL}/stats`),
                    axios.get(`${TREASURY_URL}/mini-outputs`)
                ]);

                setStats(statsRes.data);
                setMiniOutputs(outputsRes.data.mini_outputs || []);
                setError(null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, []);

    return {
        stats,
        miniOutputs,
        loading,
        error
    };
}
