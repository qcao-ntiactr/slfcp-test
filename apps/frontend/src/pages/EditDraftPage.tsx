import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';

import { RequestDetails } from '../types';
import { useHybridAuth } from '../context/HybridAuthContext';
import { getRequestDraftById } from '../api/RequestDrafts';
import { EditDraftForm } from '../components/RequestForm/EditDraftForm';

/**
 * Recursively converts all null values to undefined in an object
 * This is needed because Zod validation expects undefined for empty fields,
 * but the database returns null for empty fields
 */
const convertNullToUndefined = <T,>(obj: T): T => {
  if (obj === null) {
    return undefined as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertNullToUndefined) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      converted[key] = convertNullToUndefined(value);
    }
    return converted as T;
  }

  return obj;
};

export const EditDraftPage = () => {
  const { requestDraftId } = useParams<{ requestDraftId: string }>();

  const [requestDraft, setRequestDraft] =
    useState<Partial<RequestDetails> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useHybridAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!requestDraftId) {
      setIsLoading(false);
      return;
    }

    // Wait for authenticated user before deciding whether draft is invalid.
    if (!userId) return;

    const fetchRequestDraft = async () => {
      try {
        const data = await getRequestDraftById(
          parseInt(requestDraftId),
          userId
        );

        // Convert null values to undefined to match Zod validation expectations
        const convertedData = convertNullToUndefined(data);
        setRequestDraft(convertedData);
      } catch (err) {
        console.error('Error fetching request:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestDraft();
  }, [requestDraftId, userId]);

  const draftIdNumber = requestDraftId ? parseInt(requestDraftId, 10) : null;

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  if (!requestDraftId || isNaN(draftIdNumber!) || !requestDraft) {
    return (
      <Box>
        <Text>Draft not found or invalid draft ID.</Text>
      </Box>
    );
  }

  return (
    <>
      <EditDraftForm draftToEdit={requestDraft} draftId={draftIdNumber!} />
    </>
  );
};
