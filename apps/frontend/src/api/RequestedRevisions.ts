import apiClient from './axiosConfig';
import {
  GetRequestedRevisionsByRequestIdResponse,
  PostRequestedRevisionsByRequestIdPayload,
} from './types';

export const getRequestedRevisionsByRequestId = async (
  requestId: number
): Promise<GetRequestedRevisionsByRequestIdResponse> => {
  try {
    const { data } = await apiClient.get(
      `/requests/${requestId}/requested-revisions`
    );
    return data;
  } catch (error) {
    console.error(
      "There was an error fetching this request's most recent requested revisions",
      error
    );
    throw error;
  }
};

export const requestRevisions = async (
  requestId: number,
  payload: PostRequestedRevisionsByRequestIdPayload
) => {
  try {
    const response = await apiClient.post(
      `/requests/${requestId}/requested-revisions`,
      payload
    );
    return response;
  } catch (error) {
    console.error(
      'There was an error posting requested revisions for this request: ',
      error
    );
    throw error;
  }
};
