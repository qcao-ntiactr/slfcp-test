import { Box, Text, useDisclosure, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalFormDefaults, portalFormSchema } from '@slfcp/validation';

import { RequestDetails } from '../../types';
import { formatRequestId } from '../utils/Helpers';
import { useHybridAuth } from '../../context/HybridAuthContext';
import { deleteDraft } from '../../api/RequestDrafts';
import apiClient from '../../api/axiosConfig';

import { ConfirmationModal } from './ConfirmationModal';
import { FormContainer } from './FormContainer/FormContainer';

export interface EditDraftFormProps {
  draftToEdit: Partial<RequestDetails>;
  draftId: number;
}

export const EditDraftForm = ({ draftToEdit, draftId }: EditDraftFormProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<number | null>(
    null
  );

  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useHybridAuth();

  const {
    isOpen: submissionModalIsOpen,
    onClose: submissionModalOnClose,
    onOpen: submissionModalOnOpen,
  } = useDisclosure();

  /**
   * Closes the modal and navigates back to the homepage on successful form submission
   */
  const handleSubmissionModalClose = () => {
    submissionModalOnClose();
    navigate('/');
  };

  /**
   * Handles form submission when editing a draft.
   * This submits the form as a new request and deletes the original draft.
   * @async
   * @param {PortalFormDefaults} data - The submitted form data.
   * @returns {Promise<void>}
   */
  const onSubmit = async (data: PortalFormDefaults) => {
    // Check if user is authenticated and has an ID
    if (!user?.id) {
      toast({
        status: 'error',
        title: 'Authentication Required',
        description: 'You must be logged in to submit a request.',
        position: 'top',
      });
      return;
    }

    const formDataIsValid = portalFormSchema.safeParse(data);

    if (!formDataIsValid.success) {
      console.error('Validation failed:', formDataIsValid.error);
      return;
    }

    const newFormData = new FormData();

    // Fields that should not be included when submitting as a new request
    const excludeFields = ['id', 'createdAt', 'updatedAt', 'user'];

    Object.entries(data)
      .filter(([key, value]) => {
        // Remove undefined values, excluded fields, and null/empty values
        return (
          value !== undefined &&
          !excludeFields.includes(key) &&
          value !== null &&
          value !== '' &&
          String(value) !== 'null'
        );
      })
      .forEach(([key, value]) => {
        if (value instanceof File || value instanceof Blob) {
          // Handles file fields
          newFormData.append(key, value);
        } else if (Array.isArray(value)) {
          // Handles the frequencies array
          newFormData.append(key, JSON.stringify(value));
        } else {
          // Handles the rest of the fields
          newFormData.append(key, String(value));
        }
      });

    // Add user_id from AuthContext
    newFormData.append('user_id', user.id);

    setIsLoading(true);

    try {
      // Submit the form as a new request
      const { data: responseData } = await apiClient.post(
        `/requests`,
        newFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Delete the draft after successful submission
      await deleteDraft(draftId, user.id);

      setSubmittedRequestId(responseData.request.id);
      submissionModalOnOpen();
    } catch (error) {
      console.error('Error:', error);
      toast({
        status: 'error',
        title: 'Submission Failed',
        description:
          'There was a problem submitting the form. Please contact your system administrator.',
        position: 'top',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <FormContainer
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onSubmitHandler={onSubmit}
        request={draftToEdit}
        headerText="Edit Draft"
        draftId={draftId}
        isEditingDraft={true}
      />
      <ConfirmationModal
        isOpen={submissionModalIsOpen}
        onClose={handleSubmissionModalClose}
        handleContinueClick={handleSubmissionModalClose}
        title="Request Submitted"
        continueBtnText="OK"
        bodyContent={
          <Box w="100">
            <Text>
              {'Request has been submitted successfully with the request ID: ' +
                (submittedRequestId
                  ? formatRequestId(submittedRequestId)
                  : 'ID NOT FOUND')}
            </Text>
          </Box>
        }
      />
    </>
  );
};
