import apiClient from './axiosConfig';
import {
  GetConcurrencesByRequestIdResponse,
  PostConcurrenceByRequestIdPayload,
} from './types';

export const submitConcurrence = async (
  requestId: number,
  payload: PostConcurrenceByRequestIdPayload
) => {
  try {
    const response = await apiClient.post(
      `/requests/${requestId}/concurrences`,
      payload
    );
    return response;
  } catch (error) {
    console.error('There was an error submitting concurrence: ', error);
    throw error;
  }
};

export const getConcurrencesByRequestId = async (
  requestId: number
): Promise<GetConcurrencesByRequestIdResponse[]> => {
  try {
    const { data } = await apiClient.get(`/requests/${requestId}/concurrences`);
    return data;
  } catch (error) {
    console.error(
      "There was an error fetching this request's concurrences: ",
      error
    );
    throw error;
  }
};
