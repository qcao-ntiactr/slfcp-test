import {
  ApiResponse,
  RequestDetails,
  RequestListFilters,
  RequestSummary,
} from '../types';
import { serializeRequestListFilters } from '../components/ViewRequests/RequestsTab/filtering/requestFilterSerialization';

import apiClient from './axiosConfig';

export const getAllRequests = async (
  filters: RequestListFilters,
  userId?: string
): Promise<ApiResponse<RequestSummary>> => {
  try {
    const params = {
      ...serializeRequestListFilters(filters),
      ...(userId && { user_id: userId }),
    };

    const { data } = await apiClient.get<ApiResponse<RequestSummary>>(
      '/requests',
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
    console.error(error);
    throw error;
  }
};

export const getRequestById = async (
  requestId: string,
  userId?: string
): Promise<RequestDetails> => {
  try {
    const params = userId ? { user_id: userId } : {};

    const { data } = await apiClient.get(`/requests/${requestId}`, {
      params,
    });
    return data;
  } catch (error) {
    console.error("There was an error fetching this request's details", error);
    throw error;
  }
};
