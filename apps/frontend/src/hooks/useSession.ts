import { useState, useEffect } from 'react';

import { sessionService } from '../services/sessionService';

/**
 * Helper function to safely parse environment variables as numbers
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export interface SessionInfo {
  timeUntilLogout: number;
  timeUntilTokenExpiry: number;
  isActive: boolean;
  lastActivity: number;
}

export const useSession = () => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    timeUntilLogout: 0,
    timeUntilTokenExpiry: 0,
    isActive: false,
    lastActivity: Date.now(),
  });

  useEffect(() => {
    const updateSessionInfo = () => {
      const state = sessionService.getState();
      setSessionInfo({
        timeUntilLogout: sessionService.getTimeUntilLogout(),
        timeUntilTokenExpiry: sessionService.getTimeUntilTokenExpiry(),
        isActive: state.isActive,
        lastActivity: state.lastActivity,
      });
    };

    // Update immediately
    updateSessionInfo();

    // Calculate update interval based on token refresh interval
    // Use 1/10th of token refresh interval, but cap at 30 seconds max
    const tokenRefreshInterval = getEnvNumber(
      'VITE_TOKEN_REFRESH_INTERVAL',
      300
    ); // seconds
    const updateIntervalSeconds = Math.min(
      Math.max(tokenRefreshInterval / 10, 5),
      30
    );
    const updateIntervalMs = updateIntervalSeconds * 1000;

    // Update at calculated interval
    const interval = setInterval(updateSessionInfo, updateIntervalMs);

    // Listen for session events
    const unsubscribe = sessionService.onSessionEvent(() => {
      updateSessionInfo();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const extendSession = () => {
    sessionService.recordActivity();
  };

  const forceLogout = (reason?: string) => {
    sessionService.forceLogout(reason);
  };

  const refreshToken = async () => {
    return await sessionService.refreshToken();
  };

  return {
    sessionInfo,
    extendSession,
    forceLogout,
    refreshToken,
  };
};
