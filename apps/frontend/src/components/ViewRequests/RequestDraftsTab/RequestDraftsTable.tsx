import {
  Box,
  Button,
  Heading,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { RequestDraftFilters, RequestSummary } from 'apps/frontend/src/types';
import { GoPencil } from 'react-icons/go';
import { IoTrashOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';

import { PaginationBar } from '../PaginationBar';
import {
  convertUserRoleToEntityType,
  formatRequestDraftId,
} from '../../utils/Helpers';
import {
  useDeleteRequestDraft,
  useRequestDrafts,
} from '../../../hooks/UseRequestDrafts';
import { useHybridAuth } from '../../../context/HybridAuthContext';
import { RequestDraftHeaders } from '../../../api/RequestDrafts';
import { formatDateOrEmpty } from '../../../utils/dateUtils';
import { formatFrequencies } from '../../utils/Helpers';
import { ConfirmationModal } from '../../RequestForm/ConfirmationModal';

export const RequestDraftsTable = () => {
  const [filters, setFilters] = useState<RequestDraftFilters>({
    page: 1,
    pageSize: 10,
  });

  const [selectedRequestDraftId, setSelectedRequestDraftId] =
    useState<number>();

  const { user } = useHybridAuth();
  const { isOpen, onClose, onOpen } = useDisclosure();

  const handleDeleteDraft = () => {
    if (selectedRequestDraftId && userId)
      deleteRequestDraft.mutate({
        draftId: selectedRequestDraftId,
        userId: userId,
      });
    onClose();
  };

  const userRole = user?.role;
  const userName = user?.displayName;
  const userId = user?.id;

  const requestDraftHeaders: Partial<RequestDraftHeaders> = {
    userId: userId,
    userName: userName,
    userType: userRole ? convertUserRoleToEntityType(userRole) : undefined,
  };

  const { data, isLoading } = useRequestDrafts(filters, requestDraftHeaders);

  const dataTable = useMemo(() => data?.data || [], [data]);

  const deleteRequestDraft = useDeleteRequestDraft();

  const columns = useMemo(() => {
    return [
      {
        header: 'SUBMITTED DATE',
        key: 'submitted_date',
        render: (requestDraft: Partial<RequestSummary>) =>
          formatDateOrEmpty(requestDraft.createdAt, 'MM-dd-yyyy'),
      },
      {
        header: 'LAUNCH SERIAL NUMBER',
        key: 'id',
        render: (requestDraft: Partial<RequestSummary>) => {
          if (!requestDraft.id && !requestDraft.root_request_id) {
            return null;
          } else {
            return requestDraft.id
              ? formatRequestDraftId(requestDraft.id)
              : null;
          }
        },
      },
      {
        header: 'EMAIL',
        key: 'primary_poc_email',
        render: (requestDraft: Partial<RequestSummary>) =>
          requestDraft.primary_poc_email || null,
      },
      {
        header: 'FREQUENCIES',
        key: 'frequencies',
        render: (requestDraft: Partial<RequestSummary>) => {
          const freqString = formatFrequencies(requestDraft?.frequencies);
          if (!freqString) return null;
          return (
            <Box
              maxW="350px"
              minW="50px"
              overflowWrap="anywhere"
              whiteSpace="normal"
            >
              {freqString}
            </Box>
          );
        },
      },
      {
        header: 'EDIT',
        key: 'edit',
        render: (requestDraft: Partial<RequestSummary>) =>
          requestDraft.id ? (
            <Button
              variant="ghost"
              aria-label={`Edit draft ${requestDraft.id}`}
              as={Link}
              p={3}
              to={`/edit-draft/${requestDraft.id}`}
            >
              <GoPencil size={20} />
            </Button>
          ) : null,
      },
      {
        header: 'DELETE',
        key: 'delete',
        render: (requestDraft: Partial<RequestSummary>) => (
          <Button
            variant="ghost"
            aria-label={`Delete draft ${requestDraft.id}`}
            isLoading={deleteRequestDraft.isPending}
            isDisabled={deleteRequestDraft.isPending}
            onClick={(e) => {
              e.preventDefault();

              if (requestDraft.id && userId) {
                setSelectedRequestDraftId(requestDraft.id);
                onOpen();
              }
            }}
          >
            <IoTrashOutline size={20} />
          </Button>
        ),
      },
    ];
  }, [deleteRequestDraft.isPending, deleteRequestDraft.mutate, userId]);

  const updateFilters = (newFilters: Partial<RequestDraftFilters>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  return (
    <Box>
      <Box marginRight="auto" py={3}>
        <Heading size="xl">Request Drafts</Heading>
      </Box>
      <Box
        overflowX="auto"
        tabIndex={0}
        backgroundColor="#0077CC1A"
        p={5}
        minWidth="700px"
      >
        <Table>
          <Thead>
            <Tr>
              {columns.map((column) => (
                <Th
                  key={column.key}
                  wordBreak="normal"
                  minWidth={
                    column.key === 'edit' || column.key === 'delete'
                      ? '20px'
                      : '120px'
                  }
                >
                  {column.header}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr backgroundColor="white">
                <Td colSpan={columns.length} textAlign="center">
                  <Spinner />
                </Td>
              </Tr>
            ) : dataTable.length > 0 ? (
              dataTable.map((requestDraft) => (
                <Tr key={requestDraft.id} backgroundColor="white">
                  {columns.map((column) => {
                    const renderedContent = column.render(requestDraft);
                    const isEmpty =
                      renderedContent === '' ||
                      renderedContent === null ||
                      renderedContent === undefined;

                    return (
                      <Td
                        key={column.key}
                        maxHeight="120px"
                        overflowY="auto"
                        tabIndex={0}
                        aria-label={
                          isEmpty ? `${column.header} not available` : undefined
                        }
                      >
                        {renderedContent}
                      </Td>
                    );
                  })}
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={columns.length} textAlign="center">
                  No Request Drafts Found
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      <PaginationBar
        filters={filters}
        updateFilters={updateFilters}
        totalItems={data?.totalCount || 0}
      />

      <ConfirmationModal
        isOpen={isOpen}
        onClose={onClose}
        handleContinueClick={() => handleDeleteDraft()}
        includeCancel
        continueBtnText="Delete Draft"
        bodyContent={
          <Text>
            Are you sure you want to delete the draft? This action cannot be
            undone.
          </Text>
        }
      />
    </Box>
  );
};
