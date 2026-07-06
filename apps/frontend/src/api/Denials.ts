import apiClient from './axiosConfig';
import { PostDenialByRequestIdPayload } from './types';

export const denyRequest = async (
  requestId: number,
  payload: PostDenialByRequestIdPayload
): Promise<PostDenialByRequestIdPayload> => {
  try {
    const { data } = await apiClient.post(
      `/requests/${requestId}/denials`,
      payload
    );
    return data;
  } catch (error) {
    console.error('There was an error submitting this denial: ', error);
    throw error;
  }
};
