/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { sessionService } from '../services/sessionService';

import { HybridAuthProvider } from './HybridAuthContext';

// Mock services
vi.mock('../services/sessionService', () => ({
  sessionService: {
    initialize: vi.fn(),
    cleanup: vi.fn(),
    onSessionEvent: vi.fn(() => vi.fn()),
    updateTokenData: vi.fn(),
    forceLogout: vi.fn(),
  },
}));

vi.mock('../services/entraAuthService', () => ({
  entraAuthService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAuthMode: vi.fn().mockReturnValue('mock'),
    isEntraConfigured: vi.fn().mockReturnValue(false),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../utils/authUtils', () => ({
  isTokenExpired: vi.fn().mockReturnValue(false),
  getTokenExpirationTime: vi.fn().mockReturnValue(Date.now() + 3600000),
  getTokenConfig: vi.fn().mockReturnValue({ accessTokenExpiresIn: 3600 }),
  parseJwt: vi
    .fn()
    .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
}));

// Mock global fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ loginGovConfigured: false }),
});

// Helper to mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper to mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('HybridAuthContext', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();

    // Default mock implementation for onSessionEvent
    vi.mocked(sessionService.onSessionEvent).mockReturnValue(vi.fn());

    originalLocation = window.location;
    // @ts-expect-error - overriding location for testing
    delete (window as { location?: Location }).location;
    (window as unknown as { location: Partial<Location> }).location = {
      ...originalLocation,
      pathname: '/login',
      search: '',
      href: 'http://localhost/login',
      assign: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it('should preserve URL on inactivity timeout', async () => {
    // Setup initial state: logged in
    localStorageMock.setItem('token', 'valid-token');
    localStorageMock.setItem(
      'user',
      JSON.stringify({ id: '1', displayName: 'Test' })
    );

    // Set current location to something protected
    (window as unknown as { location: Partial<Location> }).location.pathname =
      '/protected-route';
    (window as unknown as { location: Partial<Location> }).location.search =
      '?id=123';

    // Mock sessionService.onSessionEvent to capture the callback
    let eventCallback: (_event: {
      type: string;
      data: unknown;
    }) => Promise<void>;
    vi.mocked(sessionService.onSessionEvent).mockImplementation((cb) => {
      eventCallback = cb as (_event: {
        type: string;
        data: unknown;
      }) => Promise<void>;
      return vi.fn();
    });

    render(
      <HybridAuthProvider>
        <div>Test Child</div>
      </HybridAuthProvider>
    );

    // Simulate inactivity timeout event
    await waitFor(() => expect(eventCallback).toBeDefined());

    await eventCallback!({
      type: 'logout',
      data: { reason: 'Inactivity timeout' },
    });

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'redirectUrl',
      '/protected-route?id=123'
    );
  });

  it('should redirect back to preserved URL after login', async () => {
    sessionStorageMock.setItem('redirectUrl', '/previously-visited');

    let eventCallback: (_event: {
      type: string;
      data: unknown;
    }) => Promise<void>;
    vi.mocked(sessionService.onSessionEvent).mockImplementation((cb) => {
      eventCallback = cb as (_event: {
        type: string;
        data: unknown;
      }) => Promise<void>;
      return vi.fn();
    });

    render(
      <HybridAuthProvider>
        <div>Test Child</div>
      </HybridAuthProvider>
    );

    // Simulate login event (e.g., from another tab)
    await waitFor(() => expect(eventCallback).toBeDefined());

    const tokenData = {
      access_token: 'new-token',
      expires_in: 3600,
      user: { id: '1', displayName: 'Test User' },
    };

    await eventCallback!({ type: 'login', data: tokenData });

    // In our implementation we use window.location.href = redirectUrl
    expect(window.location.href).toBe('/previously-visited');
  });

  it('should re-initialize session management on login event', async () => {
    let eventCallback: (_event: {
      type: string;
      data: unknown;
    }) => Promise<void>;
    vi.mocked(sessionService.onSessionEvent).mockImplementation((cb) => {
      eventCallback = cb as (_event: {
        type: string;
        data: unknown;
      }) => Promise<void>;
      return vi.fn();
    });

    render(
      <HybridAuthProvider>
        <div>Test Child</div>
      </HybridAuthProvider>
    );

    await waitFor(() => expect(eventCallback).toBeDefined());

    const tokenData = {
      access_token: 'new-token',
      expires_in: 3600,
      user: { id: '1', displayName: 'Test User' },
    };

    // Trigger login event
    await eventCallback!({ type: 'login', data: tokenData });

    // HybridAuthContext should call sessionService.initialize() when user/token are set
    // This happens in a useEffect triggered by the state updates in handleTokenRefresh
    await waitFor(() => {
      expect(sessionService.initialize).toHaveBeenCalled();
    });
  });
});
