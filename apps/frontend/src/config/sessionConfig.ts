import { SessionConfig } from '../services/sessionService';

/**
 * Helper function to safely parse environment variables as numbers
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  // Trim whitespace before parsing
  const parsed = parseInt(value.toString().trim(), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Convert seconds to milliseconds
 */
function secondsToMiliseconds(seconds: number): number {
  return seconds * 1000;
}

/**
 * Get token configuration from environment variables
 */
export function getTokenConfig() {
  return {
    accessTokenExpiresIn: getEnvNumber('VITE_ACCESS_TOKEN_EXPIRES_IN', 900), // 15 minutes default (in seconds)
    refreshTokenExpiresIn: getEnvNumber('VITE_REFRESH_TOKEN_EXPIRES_IN', 86400), // 24 hours default (in seconds)
  };
}

/**
 * Get session configuration from environment variables
 * All timing values are configured via environment variables with sensible defaults
 */
export function getSessionConfig(): SessionConfig {
  const config = {
    // Inactivity timeout (default: 30 minutes)
    inactivityTimeout: secondsToMiliseconds(
      getEnvNumber('VITE_INACTIVITY_TIMEOUT', 1800)
    ),

    // Warning time before logout (default: 5 minutes)
    warningTime: secondsToMiliseconds(
      getEnvNumber('VITE_SESSION_WARNING_TIME', 300)
    ),

    // Token refresh check interval (default: 5 minutes)
    tokenRefreshInterval: secondsToMiliseconds(
      getEnvNumber('VITE_TOKEN_REFRESH_INTERVAL', 300)
    ),

    // Refresh token threshold (default: 10 minutes)
    tokenRefreshThreshold: secondsToMiliseconds(
      getEnvNumber('VITE_TOKEN_REFRESH_THRESHOLD', 600)
    ),
  };

  return config;
}

// Export default configuration for backward compatibility
export const defaultSessionConfig: SessionConfig = getSessionConfig();
