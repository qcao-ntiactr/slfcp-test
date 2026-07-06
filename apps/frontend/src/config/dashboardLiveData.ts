export const DASHBOARD_STALE_TIME_MS = 1000 * 60 * 5;

export const DASHBOARD_QUERY_KEYS = {
  requestsOverTime: 'requests-over-time',
  requestCompletionTime: 'request-completion-time',
  requestsByCommercialEntity: 'requests-by-commercial-entity',
  requestsByStatus: 'requests-by-status',
} as const;

const DASHBOARD_QUERY_KEY_PREFIXES = new Set<string>(
  Object.values(DASHBOARD_QUERY_KEYS)
);

export const isDashboardLiveDataEnabled = (): boolean =>
  import.meta.env.VITE_DASHBOARD_LIVE_DATA_ENABLED === 'true';

export const isDashboardQueryKey = (queryKey: readonly unknown[]): boolean => {
  const queryKeyPrefix = queryKey[0];

  return (
    typeof queryKeyPrefix === 'string' &&
    DASHBOARD_QUERY_KEY_PREFIXES.has(queryKeyPrefix)
  );
};

export const getDashboardQueryOptions = () => {
  if (isDashboardLiveDataEnabled()) {
    return {
      staleTime: 0,
      refetchOnMount: 'always' as const,
    };
  }

  return {
    staleTime: DASHBOARD_STALE_TIME_MS,
  };
};
