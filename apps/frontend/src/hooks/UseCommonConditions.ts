import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  approveCommonCondition,
  createCommonConditionDraft,
  deleteCommonCondition,
  denyCommonCondition,
  getPublishedCommonConditions,
  getSubmittedCommonConditions,
  submitCommonConditionDraft,
  updateCommonConditionDraft,
  type CommonConditionMutationPayload,
} from '../api/CommonConditions';
import {
  ApiResponse,
  CommonConditionFilters,
  CommonConditionListItem,
} from '../types';

export const usePublishedCommonConditions = (
  filters: Pick<CommonConditionFilters, 'page' | 'pageSize'>
) => {
  return useQuery<ApiResponse<CommonConditionListItem>, Error>({
    queryKey: ['common-conditions', 'published', filters],
    queryFn: () => getPublishedCommonConditions(filters),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCommonConditionSubmissions = (
  filters: CommonConditionFilters
) => {
  return useQuery<ApiResponse<CommonConditionListItem>, Error>({
    queryKey: ['common-conditions', 'submitted', filters],
    queryFn: () => getSubmittedCommonConditions(filters),
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });
};

const invalidateCommonConditionQueries = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  queryClient.invalidateQueries({
    queryKey: ['common-conditions'],
    refetchType: 'active',
  });
};

export const useCreateCommonConditionDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CommonConditionMutationPayload) =>
      createCommonConditionDraft(payload),
    onSuccess: () => invalidateCommonConditionQueries(queryClient),
  });
};

export const useUpdateCommonConditionDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: CommonConditionMutationPayload;
    }) => updateCommonConditionDraft(id, payload),
    onSuccess: () => invalidateCommonConditionQueries(queryClient),
  });
};

export const useSubmitCommonConditionDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => submitCommonConditionDraft(id),
    onSuccess: () => invalidateCommonConditionQueries(queryClient),
  });
};

export const useDeleteCommonCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCommonCondition(id),
    onSuccess: () => invalidateCommonConditionQueries(queryClient),
  });
};

export const useApproveCommonCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => approveCommonCondition(id),
    onSuccess: () => invalidateCommonConditionQueries(queryClient),
  });
};

export const useDenyCommonCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      rejectionReason,
    }: {
      id: number;
      rejectionReason: string;
    }) => denyCommonCondition(id, rejectionReason),
    onSuccess: () => invalidateCommonConditionQueries(queryClient),
  });
};
