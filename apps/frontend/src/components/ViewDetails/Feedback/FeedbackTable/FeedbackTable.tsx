import {
  Box,
  Heading,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';

import { UserRole } from '../../../../context/HybridAuthContext';
import {
  GetActionsByRequestIdResponse,
  GetCommentsByRequestIdResponse,
} from '../../../../api/types.ts';
import { getCommentsByRequestId } from '../../../../api/Comments.ts';
import { getActionsByRequestId } from '../../../../api/Actions.ts';

import { getFeedbackColumns } from './FeedbackColumns.tsx';
export interface FeedbackTableProps {
  role: UserRole;
  requestId: number;
}

type FrontendComment = GetCommentsByRequestIdResponse & { type: 'comment' };
type FrontendAction = GetActionsByRequestIdResponse & { type: 'action' };
export type FrontendFeedback = FrontendComment | FrontendAction;

export const FeedbackTable = ({ role, requestId }: FeedbackTableProps) => {
  const columns = getFeedbackColumns();
  const [combinedFeedback, setCombinedFeedback] = useState<FrontendFeedback[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [comments, actions] = await Promise.all([
          getCommentsByRequestId(requestId),
          getActionsByRequestId(requestId),
        ]);

        const typedComments: FrontendComment[] = comments.map((c) => ({
          ...c,
          type: 'comment',
        }));

        const typedActions: FrontendAction[] = actions.map((a) => ({
          ...a,
          type: 'action',
        }));

        const combined: FrontendFeedback[] = [
          ...typedComments,
          ...typedActions,
        ].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        );

        setCombinedFeedback(combined);
      } catch (error) {
        console.error('Failed to fetch feedback', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId]);

  const filteredFeedback = useMemo(() => {
    const shouldShowConfidential = role !== UserRole.commercial;

    if (shouldShowConfidential) return combinedFeedback;

    return combinedFeedback.filter((feedback) => {
      if ('is_internal' in feedback) {
        return !feedback.is_internal;
      }
      return true;
    });
  }, [combinedFeedback, role]);

  return (
    <Box backgroundColor="#F5F7FA" overflowX="auto" m="0px auto">
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <Box tabIndex={0}>
          <Heading size="sm" mb={3}>
            Feedback
          </Heading>
          <Table>
            <Thead>
              <Tr>
                {columns.map((column) => (
                  <Th
                    key={column.key}
                    wordBreak="normal"
                    textTransform={'none'}
                    color="black"
                    minW={'150px'}
                    maxW={column.header === 'Details' ? '300px' : undefined}
                    tabIndex={0}
                  >
                    {column.header}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filteredFeedback.length > 0 ? (
                filteredFeedback.map((feedback: FrontendFeedback) => {
                  const isComment = 'comment' in feedback;
                  return (
                    <Tr
                      key={`${isComment ? 'comment' : 'action'}-${feedback.id}`}
                    >
                      {columns.map((column) => (
                        <Td
                          key={`${isComment ? 'comment' : 'action'}-${feedback.id}-${column.key}`}
                        >
                          {column.render(feedback) || 'Unavailable'}
                        </Td>
                      ))}
                    </Tr>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={columns.length} textAlign="center" tabIndex={0}>
                    No Feedback Found
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      )}{' '}
    </Box>
  );
};
