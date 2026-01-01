// File: web/forge-ui/src/services/lancelotService.ts
// Purpose: Lancelot Guardian service for monitoring and alerts
// Integrates with: Lancelot Guardian monitoring service

import axios from 'axios';

const GUARDIAN_URL = process.env.NEXT_PUBLIC_GUARDIAN_URL || 'http://localhost:8084';

/**
 * Get guardian health status
 */
export async function getGuardianHealth() {
    try {
        const response = await axios.get(`${GUARDIAN_URL}/health`);
        return response.data;
    } catch (error) {
        return { status: 'unhealthy', error: 'Connection failed' };
    }
}

/**
 * Get guardian statistics
 */
export async function getGuardianStats() {
    try {
        const response = await axios.get(`${GUARDIAN_URL}/stats`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch guardian stats:', error);
        return null;
    }
}

/**
 * Get latest alerts from guardian
 */
export async function getLatestAlerts(limit: number = 10) {
    try {
        const response = await axios.get(`${GUARDIAN_URL}/alerts`, {
            params: { limit }
        });
        return response.data.alerts || [];
    } catch (error) {
        console.error('Failed to fetch alerts:', error);
        return [];
    }
}

/**
 * Subscribe to guardian alerts (WebSocket)
 */
export function subscribeToAlerts(onAlert: (alert: any) => void) {
    // Note: This would use WebSocket in production
    // For now, poll every 30 seconds
    const interval = setInterval(async () => {
        const alerts = await getLatestAlerts(1);
        if (alerts.length > 0) {
            onAlert(alerts[0]);
        }
    }, 30000);
    
    return () => clearInterval(interval);
}
