import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markInquiryMessagesAsRead, markMessageAsRead } from '../api/Inquiries';

/**
 * Hook for marking all messages in an inquiry as read
 */
export const useMarkInquiryMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      inquiryId,
      userEmail,
    }: {
      requestId: number;
      inquiryId: number;
      userEmail: string;
    }) => markInquiryMessagesAsRead(requestId, inquiryId, userEmail),
    onSuccess: () => {
      // Invalidate requests to update unread counts and force immediate refetch
      queryClient.invalidateQueries({
        queryKey: ['requests'],
        refetchType: 'active', // Only refetch queries that are currently being observed
      });
      // Also invalidate inquiries if they're cached
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
    onError: (error) => {
      console.error('Failed to mark inquiry messages as read:', error);
    },
  });
};

/**
 * Hook for marking a specific message as read
 */
export const useMarkMessageAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      userEmail,
    }: {
      messageId: number;
      userEmail: string;
    }) => markMessageAsRead(messageId, userEmail),
    onSuccess: () => {
      // Invalidate requests to update unread counts and force immediate refetch
      queryClient.invalidateQueries({
        queryKey: ['requests'],
        refetchType: 'active', // Only refetch queries that are currently being observed
      });
      // Also invalidate inquiries if they're cached
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
    onError: (error) => {
      console.error('Failed to mark message as read:', error);
    },
  });
};
