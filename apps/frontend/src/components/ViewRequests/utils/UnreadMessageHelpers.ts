import { RequestSummary } from '../../../types';

/**
 * Determines if the unread message badge should be displayed
 * Only show badge for counts greater than 0 (hide zero counts)
 * @param count - The unread message count (can be undefined)
 * @returns true if badge should be shown, false otherwise
 */
export const shouldShowUnreadBadge = (count: number | undefined): boolean => {
  return count !== undefined && count > 0;
};

/**
 * Formats the unread message count for display
 * Shows exact count for 1-99, shows "99+" for counts over 99
 * Returns empty string for invalid/zero counts
 * @param count - The unread message count
 * @returns formatted string for display
 */
export const formatUnreadMessageCount = (count: number | undefined): string => {
  if (count === undefined || count === null || count <= 0) {
    return '';
  }
  if (count > 99) {
    return '99+';
  }
  return count.toString();
};

/**
 * Generates an accessible ARIA label for the unread message badge
 * Returns empty string for invalid/zero counts
 * @param count - The unread message count
 * @param requestId - The request ID for context (optional)
 * @returns ARIA label string
 */
export const getUnreadMessageAriaLabel = (
  count: number | undefined,
  requestId?: number
): string => {
  if (count === undefined || count === null || count <= 0) {
    return '';
  }

  const countText = count > 99 ? 'more than 99' : count.toString();
  const messageText = count === 1 ? 'message' : 'messages';
  const requestContext =
    requestId !== undefined ? ` for request ${requestId}` : '';

  return `${countText} unread ${messageText}${requestContext}`;
};

/**
 * Filters requests to only include those with unread messages
 * @param requests - Array of request summaries
 * @returns Array of requests that have unread messages (count > 0)
 */
export const filterRequestsWithUnreadMessages = (
  requests: RequestSummary[]
): RequestSummary[] => {
  return requests.filter((request) =>
    shouldShowUnreadBadge(request.unreadMessageCount)
  );
};

/**
 * Calculates the total number of unread messages across all requests
 * @param requests - Array of request summaries
 * @returns Total count of unread messages
 */
export const getTotalUnreadMessageCount = (
  requests: RequestSummary[]
): number => {
  return requests.reduce((total, request) => {
    const count = request.unreadMessageCount || 0;
    return total + count;
  }, 0);
};

/**
 * Checks if a request has any unread messages
 * @param request - The request summary to check
 * @returns true if the request has unread messages, false otherwise
 */
export const hasUnreadMessages = (request: RequestSummary): boolean => {
  return shouldShowUnreadBadge(request.unreadMessageCount);
};
