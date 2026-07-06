import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getAllRequests } from '../api/Requests';
import { ApiResponse, RequestListFilters, RequestSummary } from '../types';

export const useRequests = (filters: RequestListFilters, userId?: string) => {
  return useQuery<ApiResponse<RequestSummary>, Error>({
    queryKey: ['requests', filters, userId], // Cache each page separately
    queryFn: () => {
      return getAllRequests(filters, userId);
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // Keeps data fresh for 2 minutes (reduced from 5 minutes)
    gcTime: 30 * 60 * 1000, // Prevents cache from being garbage collected for 30 minutes
    refetchOnMount: 'always', // Always refetch when component mounts to ensure fresh notification counts
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });
};
