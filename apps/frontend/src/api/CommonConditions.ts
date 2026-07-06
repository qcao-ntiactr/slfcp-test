import {
  ApiResponse,
  CommonConditionFilters,
  CommonConditionListItem,
} from '../types';
import { CommonCondition } from '../components/ViewDetails/Feedback/FeedbackTable/CommonConditions/types';

import apiClient from './axiosConfig';

export const getAllCommonConditions = async (): Promise<CommonCondition[]> => {
  try {
    const { data } = await apiClient.get<CommonCondition[]>(
      '/common-conditions/options'
    );
    return data;
  } catch (error) {
    console.error('There was an error fetching common conditions', error);
    throw error;
  }
};

export const getPublishedCommonConditions = async (
  filters: Pick<CommonConditionFilters, 'page' | 'pageSize'>
): Promise<ApiResponse<CommonConditionListItem>> => {
  try {
    const { data } = await apiClient.get<ApiResponse<CommonConditionListItem>>(
      '/common-conditions/published',
      {
        params: filters,
      }
    );

    return {
      data: data.data,
      totalCount: data.totalCount,
      page: data.page,
      pageSize: data.pageSize,
    };
  } catch (error) {
    console.error(
      'There was an error fetching published common conditions',
      error
    );
    throw error;
  }
};

export const getSubmittedCommonConditions = async (
  filters: CommonConditionFilters
): Promise<ApiResponse<CommonConditionListItem>> => {
  try {
    const params = {
      page: filters.page,
      pageSize: filters.pageSize,
      statuses: filters.statuses,
    };

    const { data } = await apiClient.get<ApiResponse<CommonConditionListItem>>(
      '/common-conditions/submitted',
      {
        params,
      }
    );

    return {
      data: data.data,
      totalCount: data.totalCount,
      page: data.page,
      pageSize: data.pageSize,
    };
  } catch (error) {
    console.error(
      'There was an error fetching submitted common conditions',
      error
    );
    throw error;
  }
};

export type CommonConditionMutationPayload = {
  title: string;
  content: string;
};

export const createCommonConditionDraft = async (
  payload: CommonConditionMutationPayload
) => {
  try {
    const { data } = await apiClient.post('/common-conditions/drafts', payload);
    return data;
  } catch (error) {
    console.error(
      'There was an error creating a common condition draft',
      error
    );
    throw error;
  }
};

export const updateCommonConditionDraft = async (
  id: number,
  payload: CommonConditionMutationPayload
) => {
  try {
    const { data } = await apiClient.put(
      `/common-conditions/drafts/${id}`,
      payload
    );
    return data;
  } catch (error) {
    console.error(
      'There was an error updating a common condition draft',
      error
    );
    throw error;
  }
};

export const submitCommonConditionDraft = async (id: number) => {
  try {
    const { data } = await apiClient.post(`/common-conditions/${id}/submit`);
    return data;
  } catch (error) {
    console.error(
      'There was an error submitting a common condition draft',
      error
    );
    throw error;
  }
};

export const deleteCommonCondition = async (id: number) => {
  try {
    await apiClient.delete(`/common-conditions/${id}`);
  } catch (error) {
    console.error('There was an error deleting a common condition', error);
    throw error;
  }
};

export const approveCommonCondition = async (id: number) => {
  try {
    const { data } = await apiClient.post(`/common-conditions/${id}/publish`);
    return data;
  } catch (error) {
    console.error('There was an error approving a common condition', error);
    throw error;
  }
};

export const denyCommonCondition = async (
  id: number,
  rejectionReason: string
) => {
  try {
    const { data } = await apiClient.post(`/common-conditions/${id}/reject`, {
      rejectionReason,
    });
    return data;
  } catch (error) {
    console.error('There was an error denying a common condition', error);
    throw error;
  }
};
