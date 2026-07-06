import { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { HiEllipsisHorizontal } from 'react-icons/hi2';
import {
  LuCheck,
  LuEye,
  LuPencil,
  LuSend,
  LuTrash2,
  LuX,
} from 'react-icons/lu';

import {
  useApproveCommonCondition,
  useDeleteCommonCondition,
  useDenyCommonCondition,
  useSubmitCommonConditionDraft,
  useUpdateCommonConditionDraft,
} from '../../hooks/UseCommonConditions';
import {
  BackendCommonConditionStatus,
  CommonConditionListItem,
} from '../../types';
import { useHybridAuth, UserRole } from '../../context/HybridAuthContext';
import { ConfirmationModal } from '../RequestForm/ConfirmationModal';
import { StatusFilterOption } from '../FilterControls/StatusFilterBar';
import { getCommonConditionStatusLabel } from '../utils/Helpers';

import { CommonConditionDenyModal } from './CommonConditionDenyModal';
import { CommonConditionFormModal } from './CommonConditionFormModal';
import { CommonConditionViewModal } from './CommonConditionViewModal';

export const commonConditionSubmissionFilters: Array<{
  value: BackendCommonConditionStatus;
  label: string;
  backgroundColor: string;
}> = [
  {
    value: 'REJECTED',
    label: getCommonConditionStatusLabel('REJECTED'),
    backgroundColor: '#BD271E33',
  },
  {
    value: 'DRAFT',
    label: getCommonConditionStatusLabel('DRAFT'),
    backgroundColor: 'white',
  },
  {
    value: 'SUBMITTED',
    label: getCommonConditionStatusLabel('SUBMITTED'),
    backgroundColor: '#006DE433',
  },
];

export const getCommonConditionSubmissionFilters = (isNtia: boolean) =>
  commonConditionSubmissionFilters.filter(
    (option) => !(isNtia && option.value === 'DRAFT')
  );

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

interface CommonConditionActionsMenuProps {
  condition: CommonConditionListItem;
}

export const canDeleteCommonCondition = (
  condition: Pick<CommonConditionListItem, 'status' | 'isOwnedByCurrentUser'>,
  isNtia: boolean
) =>
  isNtia
    ? condition.status === 'REJECTED'
    : condition.isOwnedByCurrentUser && condition.status === 'DRAFT';

export const CommonConditionActionsMenu = ({
  condition,
}: CommonConditionActionsMenuProps) => {
  const { user } = useHybridAuth();
  const toast = useToast();
  const [menuKey, setMenuKey] = useState(0);
  const [activeEditAction, setActiveEditAction] = useState<
    'save' | 'submit' | null
  >(null);

  const viewModal = useDisclosure();
  const editModal = useDisclosure();
  const submitModal = useDisclosure();
  const deleteModal = useDisclosure();
  const approveModal = useDisclosure();
  const denyModal = useDisclosure();

  const updateDraftMutation = useUpdateCommonConditionDraft();
  const submitDraftMutation = useSubmitCommonConditionDraft();
  const deleteMutation = useDeleteCommonCondition();
  const approveMutation = useApproveCommonCondition();
  const denyMutation = useDenyCommonCondition();

  const isNtia = user?.role === UserRole.ntia;
  const canEdit =
    condition.status === 'DRAFT' && (isNtia || condition.isOwnedByCurrentUser);
  const canSubmit =
    condition.status === 'DRAFT' && (isNtia || condition.isOwnedByCurrentUser);
  const canDelete = canDeleteCommonCondition(condition, isNtia);
  const canApprove = isNtia && condition.status === 'SUBMITTED';
  const canDeny = isNtia && condition.status === 'SUBMITTED';

  const resetMenu = () => setMenuKey((currentKey) => currentKey + 1);

  const handleEditSaveDraft = async (values: {
    title: string;
    content: string;
  }) => {
    setActiveEditAction('save');
    try {
      await updateDraftMutation.mutateAsync({
        id: condition.id,
        payload: values,
      });

      toast({
        status: 'success',
        title: 'Draft Saved',
        description: 'The common condition draft was updated successfully.',
        position: 'top',
      });
      editModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Unable to Save Draft',
        description: getErrorMessage(
          error,
          'There was a problem saving this common condition draft.'
        ),
        position: 'top',
      });
    } finally {
      setActiveEditAction(null);
    }
  };

  const handleEditSubmit = async (values: {
    title: string;
    content: string;
  }) => {
    setActiveEditAction('submit');
    try {
      await updateDraftMutation.mutateAsync({
        id: condition.id,
        payload: values,
      });
      await submitDraftMutation.mutateAsync(condition.id);

      toast({
        status: 'success',
        title: 'Condition Submitted',
        description: 'The common condition was submitted for review.',
        position: 'top',
      });
      editModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Unable to Submit Condition',
        description: getErrorMessage(
          error,
          'There was a problem submitting this common condition.'
        ),
        position: 'top',
      });
    } finally {
      setActiveEditAction(null);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      await submitDraftMutation.mutateAsync(condition.id);

      toast({
        status: 'success',
        title: 'Condition Submitted',
        description: 'The common condition was submitted for review.',
        position: 'top',
      });
      submitModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Unable to Submit Condition',
        description: getErrorMessage(
          error,
          'There was a problem submitting this common condition.'
        ),
        position: 'top',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(condition.id);

      toast({
        status: 'success',
        title: 'Condition Deleted',
        description: 'The common condition was deleted successfully.',
        position: 'top',
      });
      deleteModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Unable to Delete Condition',
        description: getErrorMessage(
          error,
          'There was a problem deleting this common condition.'
        ),
        position: 'top',
      });
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(condition.id);

      toast({
        status: 'success',
        title: 'Condition Approved',
        description: 'The common condition was approved and published.',
        position: 'top',
      });
      approveModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Unable to Approve Condition',
        description: getErrorMessage(
          error,
          'There was a problem approving this common condition.'
        ),
        position: 'top',
      });
    }
  };

  const handleDeny = async (rejectionReason: string) => {
    try {
      await denyMutation.mutateAsync({
        id: condition.id,
        rejectionReason,
      });

      toast({
        status: 'success',
        title: 'Condition Denied',
        description: 'The common condition was denied.',
        position: 'top',
      });
      denyModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Unable to Deny Condition',
        description: getErrorMessage(
          error,
          'There was a problem denying this common condition.'
        ),
        position: 'top',
      });
    }
  };

  return (
    <>
      <Menu key={menuKey} placement="bottom-start" onClose={resetMenu}>
        <MenuButton
          as={Button}
          variant="ghost"
          aria-label={`Open actions for common condition ${condition.title}`}
          p={2}
          minW="auto"
        >
          <HiEllipsisHorizontal size={18} />
        </MenuButton>
        <MenuList>
          <MenuItem onClick={viewModal.onOpen}>
            <HStack spacing={2}>
              <Icon as={LuEye} boxSize={4} />
              <Text>View</Text>
            </HStack>
          </MenuItem>
          {canEdit ? (
            <MenuItem onClick={editModal.onOpen}>
              <HStack spacing={2}>
                <Icon as={LuPencil} boxSize={4} />
                <Text>Edit</Text>
              </HStack>
            </MenuItem>
          ) : null}
          {canSubmit ? (
            <MenuItem onClick={submitModal.onOpen}>
              <HStack spacing={2}>
                <Icon as={LuSend} boxSize={4} />
                <Text>Submit for Review</Text>
              </HStack>
            </MenuItem>
          ) : null}
          {canDelete ? (
            <MenuItem onClick={deleteModal.onOpen}>
              <HStack spacing={2}>
                <Icon as={LuTrash2} boxSize={4} />
                <Text>Delete</Text>
              </HStack>
            </MenuItem>
          ) : null}
          {canApprove ? (
            <MenuItem onClick={approveModal.onOpen}>
              <HStack spacing={2}>
                <Icon as={LuCheck} boxSize={4} />
                <Text>Approve</Text>
              </HStack>
            </MenuItem>
          ) : null}
          {canDeny ? (
            <MenuItem onClick={denyModal.onOpen}>
              <HStack spacing={2}>
                <Icon as={LuX} boxSize={4} />
                <Text>Deny</Text>
              </HStack>
            </MenuItem>
          ) : null}
        </MenuList>
      </Menu>

      <CommonConditionViewModal
        condition={condition}
        isOpen={viewModal.isOpen}
        onClose={viewModal.onClose}
      />

      <CommonConditionFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        mode="edit"
        initialValues={{
          title: condition.title,
          content: condition.content,
        }}
        onSaveDraft={handleEditSaveDraft}
        onSubmitCondition={handleEditSubmit}
        isSavingDraft={
          activeEditAction === 'save' && updateDraftMutation.isPending
        }
        isSubmitting={activeEditAction === 'submit'}
      />

      <ConfirmationModal
        isOpen={submitModal.isOpen}
        onClose={submitModal.onClose}
        title="Submit Common Condition"
        subtitle={`Condition Name: ${condition.title}`}
        includeCancel
        cancelBtnText="Cancel"
        continueBtnText="Submit"
        handleContinueClick={handleSubmitForReview}
        continueDisabled={submitDraftMutation.isPending}
        bodyContent={
          <Box>
            <Text>
              Are you sure you want to submit this common condition for
              review?{' '}
            </Text>
            <Text color="#8B1E1E" fontWeight="semibold">
              This action cannot be undone
            </Text>
          </Box>
        }
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.onClose}
        title="Delete Common Condition"
        subtitle={`Condition Name: ${condition.title}`}
        includeCancel
        cancelBtnText="Cancel"
        continueBtnText="Delete"
        handleContinueClick={handleDelete}
        continueDisabled={deleteMutation.isPending}
        bodyContent={
          <Box>
            <Text>Are you sure you want to delete this common condition? </Text>
            <Text color="#8B1E1E" fontWeight="semibold">
              This action cannot be undone
            </Text>
          </Box>
        }
      />

      <ConfirmationModal
        isOpen={approveModal.isOpen}
        onClose={approveModal.onClose}
        title="Approve Common Condition"
        subtitle={`Condition Name: ${condition.title}`}
        includeCancel
        cancelBtnText="Cancel"
        continueBtnText="Approve"
        handleContinueClick={handleApprove}
        continueDisabled={approveMutation.isPending}
        bodyContent={
          <Box>
            <Text>
              Are you sure you want to approve and publish this common
              condition?{' '}
            </Text>
            <Text color="#8B1E1E" fontWeight="semibold">
              This action cannot be undone
            </Text>
          </Box>
        }
      />

      <CommonConditionDenyModal
        isOpen={denyModal.isOpen}
        onClose={denyModal.onClose}
        onConfirm={handleDeny}
        isSubmitting={denyMutation.isPending}
        conditionTitle={condition.title}
      />
    </>
  );
};

export const commonConditionStatusFilterOptions: StatusFilterOption<BackendCommonConditionStatus>[] =
  commonConditionSubmissionFilters.map((filter) => ({
    value: filter.value,
    label: filter.label,
    backgroundColor: filter.backgroundColor,
  }));
