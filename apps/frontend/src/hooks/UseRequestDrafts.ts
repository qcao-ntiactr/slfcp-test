import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { ApiResponse, RequestDraftFilters, RequestSummary } from '../types';
import {
  deleteDraft,
  getAllRequestDrafts,
  RequestDraftHeaders,
} from '../api/RequestDrafts';

export const useRequestDrafts = (
  filters: RequestDraftFilters,
  headers: Partial<RequestDraftHeaders>
) => {
  return useQuery<ApiResponse<Partial<RequestSummary>>, Error>({
    queryKey: ['request-drafts', filters], // Cache each page separately
    queryFn: () => getAllRequestDrafts(filters, headers),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // Keeps data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Prevents cache from being garbage collected for 30 minutes
    refetchOnMount: 'always',
  });
};

export const useDeleteRequestDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draftId, userId }: { draftId: number; userId: string }) =>
      deleteDraft(draftId, userId),
    onSuccess: () => {
      // Invalidate request drafts to update unread counts and force immediate refetch
      queryClient.invalidateQueries({
        queryKey: ['request-drafts'],
        refetchType: 'active', // Only refetch queries that are currently being observed
      });
    },
    onError: (error) => {
      console.error('Failed to delete request draft:', error);
    },
  });
};
