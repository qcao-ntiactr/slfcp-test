import apiClient from './axiosConfig';
import { PostRevisionByRequestIdPayload } from './types';

export const submitRevision = async (
  requestId: number,
  payload: PostRevisionByRequestIdPayload
) => {
  try {
    const response = await apiClient.post(
      `/requests/${requestId}/revisions`,
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
