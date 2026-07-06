// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { User } from '../context/HybridAuthContext';

// Mock BroadcastChannel BEFORE importing sessionService
const postMessageMock = vi.fn();
const closeMock = vi.fn();

class MockBroadcastChannel {
  name: string;
  onmessage: ((_event: MessageEvent) => void) | null = null;
  postMessage = postMessageMock;
  close = closeMock;

  constructor(name: string) {
    this.name = name;
  }
}

const createStorageMock = (): Storage => {
  let items: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(items).length;
    },
    clear: () => {
      items = {};
    },
    getItem: (key: string) => items[key] ?? null,
    key: (index: number) => Object.keys(items)[index] ?? null,
    removeItem: (key: string) => {
      delete items[key];
    },
    setItem: (key: string, value: string) => {
      items[key] = String(value);
    },
  };
};

// @ts-expect-error - Mocking global BroadcastChannel
global.BroadcastChannel = MockBroadcastChannel;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: createStorageMock(),
});
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: createStorageMock(),
});

const mockUser: User = {
  id: '1',
  displayName: 'Test User',
  userPrincipalName: 'test.user@example.com',
  email: 'test.user@example.com',
  role: 'NTIA' as User['role'],
  tenantId: 'tenant-1',
};

// Now import SessionService class
import { SessionService } from './sessionService';

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    sessionService = new SessionService();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionService?.cleanup();
  });

  it('should initialize and setup listeners', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    sessionService.initialize();

    expect(addEventListenerSpy).toHaveBeenCalled();
  });

  it('should broadcast login event across tabs', () => {
    const tokenData = {
      access_token: 'test-token',
      expires_in: 3600,
      user: mockUser,
    };

    sessionService.initialize();
    sessionService.updateTokenData(tokenData);

    expect(postMessageMock).toHaveBeenCalledWith({
      type: 'login',
      data: tokenData,
    });
  });

  it('should emit local login event', () => {
    const tokenData = {
      access_token: 'test-token',
      expires_in: 3600,
      user: mockUser,
    };

    const callback = vi.fn();
    sessionService.onSessionEvent(callback);
    sessionService.updateTokenData(tokenData);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'login',
        data: tokenData,
      })
    );
  });

  it('should close syncChannel on cleanup', () => {
    sessionService.initialize();
    sessionService.cleanup();
    expect(closeMock).toHaveBeenCalled();
  });
});
