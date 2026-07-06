import apiClient from './axiosConfig';
import { GetActionsByRequestIdResponse } from './types';

export const getActionsByRequestId = async (
  requestId: number
): Promise<GetActionsByRequestIdResponse[]> => {
  try {
    const { data } = await apiClient.get(`/requests/${requestId}/actions`);
    return data;
  } catch (error) {
    console.error("There was an error fetching this request's actions", error);
    throw error;
  }
};

// submitAction function removed - actions are now automatically created by the backend
// when approvals, denials, concurrences, or revisions are submitted
