import axios from 'axios';
import _ from 'lodash';

import { getSessionConfig } from '../config/sessionConfig';
import { User } from '../context/HybridAuthContext';

import { TokenResponse } from './entraAuthService';

export interface SessionConfig {
  inactivityTimeout: number; // in milliseconds
  warningTime: number; // in milliseconds before logout to show warning
  tokenRefreshInterval: number; // in milliseconds
  tokenRefreshThreshold: number; // refresh token when this many ms remain
}

export interface SessionState {
  isActive: boolean;
  lastActivity: number;
  tokenExpiresAt: number | null;
  warningShown: boolean;
}

export interface TokenData {
  access_token: string;
  expires_in: number;
  user?: User;
}

export type SessionEvent =
  | { type: 'login'; data: TokenData }
  | { type: 'warning'; data: { timeRemainingMs: number } }
  | {
      type: 'logout';
      data: { reason: string };
    }
  | { type: 'tokenRefreshed'; data: TokenResponse }
  | { type: 'activityDetected'; data: { at: number } };

type SessionEventType = SessionEvent['type'];

//eslint-disable-next-line no-unused-vars
type SessionEventCallback = (event: SessionEvent) => void;

export class SessionService {
  private config: SessionConfig;

  private state: SessionState = {
    isActive: false,
    lastActivity: Date.now(),
    tokenExpiresAt: null,
    warningShown: false,
  };

  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private eventCallbacks: SessionEventCallback[] = [];
  private syncChannel: BroadcastChannel | null = null;
  private isRefreshing = false;

  // Activity events to track
  private readonly activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
  ];

  constructor(customConfig?: Partial<SessionConfig>) {
    this.config = getSessionConfig();
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Initialize sync channel immediately to support login/logout sync across tabs
    this.syncChannel = new BroadcastChannel('auth_session_sync');
    this.syncChannel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'login') {
        this.updateTokenData(data, true);
      } else if (type === 'logout') {
        this.forceLogout(data.reason, true);
      } else if (type === 'activity') {
        this.recordActivity(true);
      }
    };
  }

  /**
   * Initialize session management
   */
  public initialize(): void {
    if (this.state.isActive) {
      return; // Already initialized
    }

    this.state.isActive = true;
    this.state.lastActivity = Date.now();

    this.setupActivityListeners();
    this.startInactivityTimer();
    this.startTokenRefreshTimer();
  }

  /**
   * Cleanup session management
   */
  public cleanup(): void {
    this.state.isActive = false;

    this.removeActivityListeners();
    this.clearTimers();

    if (
      this.handleActivity &&
      typeof this.handleActivity.cancel === 'function'
    ) {
      this.handleActivity.cancel();
    }

    if (this.syncChannel) {
      this.syncChannel.close();
      this.syncChannel = null;
    }
  }

  /**
   * Update session with new token data
   */
  public updateTokenData(
    tokenData: TokenData,
    isExternal: boolean = false
  ): void {
    const expiresAt = Date.now() + tokenData.expires_in * 1000;
    this.state.tokenExpiresAt = expiresAt;

    // Store token data
    localStorage.setItem('token', tokenData.access_token);
    if (tokenData.user) {
      localStorage.setItem('user', JSON.stringify(tokenData.user));
    }
    localStorage.setItem('tokenExpiresAt', expiresAt.toString());

    // Broadcast if it's a local login/refresh
    if (!isExternal && this.syncChannel) {
      this.syncChannel.postMessage({ type: 'login', data: tokenData });
    }

    // Emit event to notify UI components (like HybridAuthContext)
    this.emitEvent('login', tokenData);
    this.emitEvent('tokenRefreshed', {
      ...tokenData,
      token_type: 'Bearer',
    } as TokenResponse);
  }

  /**
   * Register event callback
   */
  public onSessionEvent(callback: SessionEventCallback): () => void {
    this.eventCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current session state
   */
  public getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Get time until inactivity logout (in milliseconds)
   */
  public getTimeUntilLogout(): number {
    const timeSinceActivity = Date.now() - this.state.lastActivity;
    const timeRemaining = this.config.inactivityTimeout - timeSinceActivity;
    return Math.max(0, timeRemaining);
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  public getTimeUntilTokenExpiry(): number {
    if (!this.state.tokenExpiresAt) {
      return 0;
    }
    return Math.max(0, this.state.tokenExpiresAt - Date.now());
  }

  /**
   * Manually trigger activity (useful for programmatic activity)
   */
  public recordActivity(isExternal: boolean = false): void {
    if (!this.state.isActive) {
      return;
    }

    this.state.lastActivity = Date.now();
    this.state.warningShown = false;

    // Broadcast activity to other tabs if it's a local event
    if (!isExternal && this.syncChannel) {
      this.syncChannel.postMessage({ type: 'activity' });
    }

    this.resetInactivityTimer();
    this.emitEvent('activityDetected', { at: this.state.lastActivity });
  }

  /**
   * Force logout
   */
  public forceLogout(
    reason: string = 'Manual logout',
    isExternal: boolean = false
  ): void {
    if (!isExternal && this.syncChannel) {
      this.syncChannel.postMessage({ type: 'logout', data: { reason } });
    }
    this.emitEvent('logout', { reason });
  }

  /**
   * Attempt to refresh token
   * Sends the refresh token from sessionStorage via Authorization header
   */
  public async refreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      return false;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const storedToken = localStorage.getItem('token');

    this.isRefreshing = true;

    try {
      // Support mock refresh for testing locally
      if (storedToken === 'mock.jwt.token') {
        console.log('Simulating mock token refresh...');
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : undefined;

        // Just update with the same data to reset the timer
        this.updateTokenData({
          access_token: 'mock.jwt.token',
          expires_in: getSessionConfig().tokenRefreshInterval / 1000 + 60, // Ensure it doesn't expire immediately again
          user,
        });
        return true;
      }

      const refreshToken = sessionStorage.getItem('refreshToken');

      if (!refreshToken) {
        console.error('No refresh token available');
        this.forceLogout('Refresh token missing');
        return false;
      }

      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );

      // Update access token
      this.updateTokenData({
        access_token: data.access_token,
        expires_in: data.expires_in,
        user: data.user,
      });

      // Store the new refresh token from response
      if (data.refresh_token) {
        sessionStorage.setItem('refreshToken', data.refresh_token);
      }

      this.emitEvent('tokenRefreshed', data);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.forceLogout('Token refresh failed');
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Setup activity event listeners
   */
  private setupActivityListeners(): void {
    this.activityEvents.forEach((event) => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  /**
   * Remove activity event listeners
   */
  private removeActivityListeners(): void {
    this.activityEvents.forEach((event) => {
      document.removeEventListener(event, this.handleActivity);
    });
  }

  /**
   * Handle activity events
   */
  private handleActivity = _.throttle(
    (): void => {
      this.recordActivity();
    },
    1000,
    { trailing: true }
  );

  /**
   * Start inactivity timer
   */
  private startInactivityTimer(): void {
    // Only start if not already running
    if (!this.activityTimer && !this.warningTimer) {
      this.resetInactivityTimer();
    }
  }

  /**
   * Reset inactivity timer
   */
  private resetInactivityTimer(): void {
    this.clearInactivityTimers();

    // Set warning timer
    const warningDelay =
      this.config.inactivityTimeout - this.config.warningTime;

    this.warningTimer = setTimeout(() => {
      if (!this.state.warningShown) {
        this.state.warningShown = true;
        this.emitEvent('warning', {
          timeRemainingMs: this.config.warningTime,
        });
      }
    }, warningDelay);

    // Set logout timer
    this.activityTimer = setTimeout(() => {
      this.forceLogout('Inactivity timeout');
    }, this.config.inactivityTimeout);
  }

  /**
   * Start token refresh timer
   */
  private startTokenRefreshTimer(): void {
    this.tokenRefreshTimer = setInterval(() => {
      this.checkTokenRefresh();
    }, this.config.tokenRefreshInterval);
  }

  /**
   * Check if token needs refresh
   */
  private checkTokenRefresh(): void {
    // Skip token expiration checks if no expiration is set (e.g., for mock tokens)
    if (!this.state.tokenExpiresAt || this.isRefreshing) {
      return;
    }

    const timeUntilExpiry = this.getTimeUntilTokenExpiry();

    if (
      timeUntilExpiry > 0 &&
      timeUntilExpiry <= this.config.tokenRefreshThreshold
    ) {
      this.refreshToken();
    } else if (timeUntilExpiry <= 0 && this.state.tokenExpiresAt) {
      this.forceLogout('Token expired');
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearInactivityTimers();

    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Clear inactivity timers
   */
  private clearInactivityTimers(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Emit session event
   */
  private emitEvent<T extends SessionEventType>(
    type: T,
    data: Extract<SessionEvent, { type: T }>['data']
  ): void {
    const event = { type, data } as Extract<SessionEvent, { type: T }>;
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Session event callback error:', error);
      }
    });
  }
}

export const sessionService = new SessionService();
