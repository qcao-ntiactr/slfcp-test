// src/lib/reactQueryService.ts
import {
  QueryClient,
  defaultShouldDehydrateQuery,
  dehydrate,
  hydrate,
  type DehydratedState,
  type Query,
} from '@tanstack/react-query';

import {
  isDashboardLiveDataEnabled,
  isDashboardQueryKey,
} from '../config/dashboardLiveData';

// ------------------------------------------------------
// Configuration
// ------------------------------------------------------

/** Default query caching behavior */
const defaultOptions = {
  queries: {
    staleTime: 1000 * 60 * 60 * 12, // 12 hours "fresh"
    gcTime: 1000 * 60 * 60 * 24, // 24 hours kept in cache
    refetchOnWindowFocus: false,
    retry: 1,
  },
};

/** Session storage key for cached data */
const CACHE_KEY = 'react-query-session-cache';
/** How long persisted cache remains valid (ms) */
const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

// ------------------------------------------------------
// Query Client setup
// ------------------------------------------------------

export const queryClient = new QueryClient({
  defaultOptions,
});

// ------------------------------------------------------
// Persistence / Rehydration logic
// ------------------------------------------------------

const getHydratableState = (state: DehydratedState): DehydratedState => {
  if (!isDashboardLiveDataEnabled()) {
    return state;
  }

  return {
    ...state,
    queries: state.queries.filter(
      (query) => !isDashboardQueryKey(query.queryKey)
    ),
  };
};

const shouldPersistQuery = (query: Query): boolean =>
  defaultShouldDehydrateQuery(query) &&
  (!isDashboardLiveDataEnabled() || !isDashboardQueryKey(query.queryKey));

/**
 * Persist and rehydrate the React Query cache using sessionStorage.
 * Automatically invalidates cache older than MAX_AGE.
 */
export function initializeQueryPersistence(): void {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { timestamp, state } = JSON.parse(raw);
      const age = Date.now() - timestamp;

      // Only rehydrate if cache is still valid
      if (age < MAX_AGE && state) {
        hydrate(queryClient, getHydratableState(state));
        console.log('[ReactQuery] Cache rehydrated from sessionStorage.');
      } else {
        console.log('[ReactQuery] Cache expired, ignoring old session data.');
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  } catch (err) {
    console.warn('[ReactQuery] Failed to rehydrate cache:', err);
    sessionStorage.removeItem(CACHE_KEY);
  }

  // Persist before tab unload
  window.addEventListener('beforeunload', persistCache);
}

/** Save the cache to sessionStorage */
export function persistCache() {
  try {
    const dehydrated = dehydrate(queryClient, {
      shouldDehydrateQuery: shouldPersistQuery,
    });
    const payload = {
      timestamp: Date.now(),
      state: dehydrated,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    // console.log('[ReactQuery] Cache persisted to sessionStorage.');
  } catch (err) {
    console.warn('[ReactQuery] Failed to persist cache:', err);
  }
}

/** Clear cache manually (e.g., on logout) */
export function clearQueryCache(): void {
  queryClient.clear();
  sessionStorage.removeItem(CACHE_KEY);
  console.log('[ReactQuery] Cache cleared.');
}
