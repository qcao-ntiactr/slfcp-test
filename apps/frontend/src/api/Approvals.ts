import apiClient from './axiosConfig';
import {
  GetApprovalsByRequestIdResponse,
  PostApprovalByRequestIdPayload,
} from './types';

export const getApprovalsByRequestId = async (
  requestId: string
): Promise<GetApprovalsByRequestIdResponse> => {
  try {
    const { data } = await apiClient.get(`/requests/${requestId}/approvals`);
    return data;
  } catch (error) {
    console.error(
      'There was an error getting approvals for this request: ',
      error
    );
    throw error;
  }
};

export const approveRequest = async (
  requestId: number,
  payload: PostApprovalByRequestIdPayload
): Promise<PostApprovalByRequestIdPayload> => {
  try {
    const { data } = await apiClient.post(
      `/requests/${requestId}/approvals`,
      payload
    );
    return data;
  } catch (error) {
    console.error('There was an error approving this request: ', error);
    throw error;
  }
};
