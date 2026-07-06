import type { GetInquiriesResponse } from '../components/Inquiries/types';

import apiClient from './axiosConfig';

/**
 * Fetches all inquiries for a specific request from the backend API.
 * Includes user email in headers for authentication and authorization.
 *
 * @param requestId - The ID of the request to fetch inquiries for
 * @param userEmail - The email of the authenticated user
 * @returns Promise resolving to the grouped inquiries response
 * @throws Error if the API request fails
 */
export const fetchInquiries = async (
  requestId: number,
  userEmail: string
): Promise<GetInquiriesResponse> => {
  try {
    const { data } = await apiClient.get(`/requests/${requestId}/inquiries`, {
      headers: {
        'x-user-email': userEmail,
      },
    });
    return data;
  } catch (err) {
    console.error('Something went wrong fetching inquiries', err);
    throw err;
  }
};

/**
 * Creates a new inquiry between two entities for a specific request.
 * Establishes a communication channel between entityA and entityB.
 *
 * @param requestId - The ID of the request to create the inquiry for
 * @param userEmail - The email of the authenticated user creating the inquiry
 * @param entityB_id - The ID of the recipient entity
 * @param entityA_id - Optional ID of the sender entity
 * @returns Promise resolving to the API response
 * @throws Error if the inquiry creation fails
 */
export const createInquiry = async (
  requestId: number,
  userEmail: string,
  entityB_id: number,
  entityA_id?: number
) => {
  try {
    const res = await apiClient.post(
      `/requests/${requestId}/inquiries`,
      { entityA_id, entityB_id },
      {
        headers: {
          'x-user-email': userEmail,
        },
      }
    );
    return res;
  } catch (err) {
    console.error('there was an error creating inquiry', err);
    throw err;
  }
};

interface postMessagePayload {
  inquiryId?: number; // Optional - undefined for new inquiries
  userEmail: string;
  content: string;
  recipientEntityId?: number;
  requestId: number;
}

/**
 * Posts a new message to an existing inquiry.
 * Sends a message with content and timestamp to the specified inquiry,
 * targeting a specific recipient entity.
 *
 * @param payload - Object containing message details
 * @param payload.inquiryId - The ID of the inquiry to post the message to
 * @param payload.userEmail - The email of the authenticated user sending the message
 * @param payload.content - The text content of the message
 * @param payload.recipientEntityId - The ID of the entity receiving the message
 * @param payload.requestId - The ID of the parent request
 * @returns Promise resolving to the API response
 * @throws Error if the message posting fails
 */
export const postMessage = async ({
  inquiryId,
  userEmail,
  content,
  recipientEntityId,
  requestId,
}: postMessagePayload) => {
  // Validate required parameters
  if (!userEmail || !content || !requestId) {
    const error = new Error('Missing required parameters for posting message');
    console.error('Missing required parameters:', {
      inquiryId: !!inquiryId,
      userEmail: !!userEmail,
      content: !!content,
      requestId: !!requestId,
      recipientEntityId: !!recipientEntityId,
    });
    throw error;
  }

  // For new inquiries, recipientEntityId is required
  if (!inquiryId && !recipientEntityId) {
    const error = new Error(
      'recipientEntityId is required when creating new inquiry'
    );
    console.error('recipientEntityId required for new inquiry');
    throw error;
  }

  try {
    // Use -1 in URL for new inquiries - backend will handle this case
    const urlInquiryId = inquiryId || -1;

    const res = await apiClient.post(
      `/requests/${requestId}/inquiries/${urlInquiryId}/messages`,
      {
        content: content,
        sentAt: new Date(),
        recipient_entity_id: recipientEntityId,
      },
      {
        headers: {
          'x-user-email': userEmail,
        },
      }
    );
    return res;
  } catch (err) {
    console.error('There was a problem posting message', err);
    throw err;
  }
};

/**
 * Marks all messages in an inquiry as read by the current user.
 *
 * @param requestId - The ID of the request containing the inquiry
 * @param inquiryId - The ID of the inquiry to mark messages as read
 * @param userEmail - The email of the authenticated user
 * @returns Promise resolving to the API response
 * @throws Error if the request fails
 */
export const markInquiryMessagesAsRead = async (
  requestId: number,
  inquiryId: number,
  userEmail: string
) => {
  try {
    const res = await apiClient.post(
      `/requests/${requestId}/inquiries/${inquiryId}/mark-read`,
      {},
      {
        headers: {
          'x-user-email': userEmail,
        },
      }
    );
    return res;
  } catch (err) {
    console.error('Error marking inquiry messages as read', err);
    throw err;
  }
};

/**
 * Marks a specific message as read by the current user.
 *
 * @param messageId - The ID of the message to mark as read
 * @param userEmail - The email of the authenticated user
 * @returns Promise resolving to the API response
 * @throws Error if the request fails
 */
export const markMessageAsRead = async (
  messageId: number,
  userEmail: string
) => {
  try {
    const res = await apiClient.put(
      `/messages/${messageId}/mark-read`,
      {},
      {
        headers: {
          'x-user-email': userEmail,
        },
      }
    );
    return res;
  } catch (err) {
    console.error('Error marking message as read', err);
    throw err;
  }
};
