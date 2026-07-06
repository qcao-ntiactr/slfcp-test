// @vitest-environment jsdom
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DASHBOARD_QUERY_KEYS } from '../config/dashboardLiveData';

import {
  initializeQueryPersistence,
  persistCache,
  queryClient,
} from './reactQueryService';

const CACHE_KEY = 'react-query-session-cache';

const getPersistedQueryKeys = () => {
  const rawCache = sessionStorage.getItem(CACHE_KEY);

  expect(rawCache).not.toBeNull();

  const { state } = JSON.parse(rawCache as string);

  return state.queries.map(
    (query: { queryKey: readonly unknown[] }) => query.queryKey
  );
};

describe('reactQueryService persistence', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    queryClient.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    queryClient.clear();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('keeps non-dashboard queries persisted when dashboard live data is enabled', () => {
    vi.stubEnv('VITE_DASHBOARD_LIVE_DATA_ENABLED', 'true');

    queryClient.setQueryData(['requests', { page: 1 }], {
      items: ['cached request'],
    });
    queryClient.setQueryData(
      [DASHBOARD_QUERY_KEYS.requestsByStatus],
      [{ status: 'submitted' }]
    );

    persistCache();

    const persistedQueryKeys = getPersistedQueryKeys();

    expect(persistedQueryKeys).toContainEqual(['requests', { page: 1 }]);
    expect(persistedQueryKeys).not.toContainEqual([
      DASHBOARD_QUERY_KEYS.requestsByStatus,
    ]);
  });

  it('rehydrates non-dashboard queries but skips dashboard queries in live data mode', () => {
    vi.stubEnv('VITE_DASHBOARD_LIVE_DATA_ENABLED', 'true');

    const cachedRequests = { items: ['cached request'] };
    const cachedDashboardData = [{ status: 'submitted' }];
    const persistedClient = new QueryClient();

    persistedClient.setQueryData(['requests', { page: 1 }], cachedRequests);
    persistedClient.setQueryData(
      [DASHBOARD_QUERY_KEYS.requestsByStatus],
      cachedDashboardData
    );

    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        state: dehydrate(persistedClient),
      })
    );

    initializeQueryPersistence();

    expect(queryClient.getQueryData(['requests', { page: 1 }])).toEqual(
      cachedRequests
    );
    expect(
      queryClient.getQueryData([DASHBOARD_QUERY_KEYS.requestsByStatus])
    ).toBeUndefined();
  });

  it('keeps the default success-only dehydration behavior', async () => {
    queryClient.setQueryData(['requests', { page: 1 }], {
      items: ['cached request'],
    });

    await queryClient
      .fetchQuery({
        queryKey: ['failed-request'],
        queryFn: async () => {
          throw new Error('Request failed');
        },
        retry: false,
      })
      .catch(() => undefined);

    persistCache();

    const persistedQueryKeys = getPersistedQueryKeys();

    expect(persistedQueryKeys).toContainEqual(['requests', { page: 1 }]);
    expect(persistedQueryKeys).not.toContainEqual(['failed-request']);
  });
});
