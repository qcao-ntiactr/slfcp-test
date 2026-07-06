import { EntityType } from '../components/Inquiries/types';
import { RequestDraftFilters } from '../types';

import apiClient from './axiosConfig';

export type RequestDraftHeaders = {
  userId: string;
  userName: string;
  userType: EntityType;
};

export const getAllRequestDrafts = async (
  filters: RequestDraftFilters,
  headers: Partial<RequestDraftHeaders>
) => {
  if (!headers.userId || !headers.userName || !headers.userType) {
    throw new Error(
      'Missing parameters or headers. Fetch of request drafts not attempted.'
    );
  }

  try {
    const { data } = await apiClient.get(`/request-drafts/`, {
      headers: headers,
      params: filters,
    });
    return {
      data: data.data,
      totalCount: data.totalCount,
      page: data.page,
      pageSize: data.pageSize,
    };
  } catch (error) {
    console.error('Something went wrong when fetching request drafts', error);
    throw error;
  }
};

export const getRequestDraftById = async (
  requestDraftId: number,
  userId: string
) => {
  try {
    const { data } = await apiClient.get(`/request-drafts/${requestDraftId}`, {
      params: { user_id: userId },
    });
    return data;
  } catch (error) {
    console.error(
      `Something went wrong fetching request draft ${requestDraftId}`,
      error
    );
    throw error;
  }
};

export const submitDraft = async (
  data: FormData,
  headers: RequestDraftHeaders
) => {
  try {
    await apiClient.post(`/request-drafts`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-user-id': headers.userId,
        'x-user-name': headers.userName,
        'x-user-type': headers.userType,
      },
    });
  } catch (error) {
    console.error('Something went wrong submitting the draft', error);
    throw error;
  }
};

export const updateDraft = async (
  draftId: number,
  data: FormData,
  headers: RequestDraftHeaders
) => {
  try {
    await apiClient.put(`/request-drafts/${draftId}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-user-id': headers.userId,
        'x-user-name': headers.userName,
        'x-user-type': headers.userType,
      },
    });
  } catch (error) {
    console.error('Something went wrong updating the draft', error);
    throw error;
  }
};

export const deleteDraft = async (draftId: number, userId: string) => {
  try {
    await apiClient.delete(`/request-drafts/${draftId}`, {
      params: { ['user_id']: userId },
    });
  } catch (error) {
    console.error('Something went wrong deleting the draft', error);
    throw error;
  }
};
