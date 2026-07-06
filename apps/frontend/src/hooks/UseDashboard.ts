// src/hooks/useDashboardData.ts
import { useQuery } from '@tanstack/react-query';

import apiClient from '../api/axiosConfig';
import { completionTimeData } from '../components/Dashboard/CompletionTimeValues';
import {
  DASHBOARD_QUERY_KEYS,
  getDashboardQueryOptions,
} from '../config/dashboardLiveData';
import { RequestsByCommercialEntityData, RequestsByStatusData } from '../types';

export type Timeframe = 'week' | 'month' | 'quarter';

/** Requests Over Time */
export const useRequestsOverTime = (timeframe?: Timeframe) => {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEYS.requestsOverTime, timeframe],
    queryFn: async () => {
      const res = await apiClient.get(
        `/dashboard/requests-over-time/${timeframe}`
      );
      return res.data;
    },
    enabled: !!timeframe, // Only run if timeframe is defined
    ...getDashboardQueryOptions(),
  });
};

/** Request Completion Time */
export const useRequestCompletionTime = (timeframe?: Timeframe) => {
  return useQuery<completionTimeData[]>({
    queryKey: [DASHBOARD_QUERY_KEYS.requestCompletionTime, timeframe],
    queryFn: async () => {
      const res = await apiClient.get(
        `/dashboard/request-completion-time/${timeframe}`
      );
      return res.data;
    },
    enabled: !!timeframe,
    ...getDashboardQueryOptions(),
  });
};

/** Requests by Commercial Entity */
export const useRequestsByCommercialEntity = () => {
  return useQuery<RequestsByCommercialEntityData[]>({
    queryKey: [DASHBOARD_QUERY_KEYS.requestsByCommercialEntity],
    queryFn: async () => {
      const res = await apiClient.get(
        `/dashboard/requests-by-commercial-entity`
      );
      return res.data;
    },
    ...getDashboardQueryOptions(),
  });
};

/** Requests by Status */
export const useRequestsByStatus = () => {
  return useQuery<RequestsByStatusData[]>({
    queryKey: [DASHBOARD_QUERY_KEYS.requestsByStatus],
    queryFn: async () => {
      const res = await apiClient.get(`/dashboard/requests-by-status`);
      return res.data;
    },
    ...getDashboardQueryOptions(),
  });
};
