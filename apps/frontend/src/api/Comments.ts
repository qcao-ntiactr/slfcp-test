import apiClient from './axiosConfig';
import {
  GetCommentsByRequestIdResponse,
  PostCommentByRequestIdPayload,
} from './types';

export const getCommentsByRequestId = async (
  requestId: number
): Promise<GetCommentsByRequestIdResponse[]> => {
  try {
    const { data } = await apiClient.get(`/requests/${requestId}/comments`);
    return data;
  } catch (error) {
    console.error("There was an error fetching this request's comments", error);
    throw error;
  }
};

export const submitComment = async (
  requestId: number,
  payload: PostCommentByRequestIdPayload
) => {
  try {
    const response = await apiClient.post(
      `/requests/${requestId}/comments`,
      payload
    );
    return response;
  } catch (error) {
    console.error(
      'There was an error posting comment for this request: ',
      error
    );
    throw error;
  }
};
