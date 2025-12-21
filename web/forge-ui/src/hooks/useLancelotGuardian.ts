// File: web/forge-ui/src/hooks/useLancelotGuardian.ts
// Purpose: React hook for Lancelot Guardian monitoring
// Integrates with: Lancelot Guardian service

import { useState, useEffect } from 'react';
import { getGuardianStats, getLatestAlerts, subscribeToAlerts } from '../services/lancelotService';

export function useLancelotGuardian() {
    const [stats, setStats] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [latestAlert, setLatestAlert] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            const [statsData, alertsData] = await Promise.all([
                getGuardianStats(),
                getLatestAlerts(10)
            ]);

            setStats(statsData);
            setAlerts(alertsData);
        };

        fetchData();
        const interval = setInterval(fetchData, 15000); // Every 15 seconds

        // Subscribe to real-time alerts
        const unsubscribe = subscribeToAlerts((alert) => {
            setLatestAlert(alert);
            setAlerts(prev => [alert, ...prev].slice(0, 10));
        });

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, []);

    return {
        stats,
        alerts,
        latestAlert
    };
}
