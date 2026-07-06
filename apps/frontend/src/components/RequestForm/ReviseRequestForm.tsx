import { Box, Text, useDisclosure, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalFormDefaults, portalFormSchema } from '@slfcp/validation';

import { RequestDetails } from '../../types';
import { formatRequestId } from '../utils/Helpers';
// submitAction import removed - actions are now automatically created by the backend
import { useHybridAuth } from '../../context/HybridAuthContext';
import apiClient from '../../api/axiosConfig';

import { ConfirmationModal } from './ConfirmationModal';
import { FormContainer } from './FormContainer/FormContainer';

export interface ReviseRequestFormProps {
  requestToRevise: RequestDetails;
}
export const ReviseRequestForm = ({
  requestToRevise,
}: ReviseRequestFormProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rootId, setRootId] = useState<number>(
    requestToRevise.root_request_id || requestToRevise.id
  );

  const navigate = useNavigate();
  const toast = useToast();

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

  const { user } = useHybridAuth();

  /**
   * Handles form submission, validates the data, and sends it to the server.
   * Converts form data into a FormData object to support file uploads.
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
        description: 'You must be logged in to submit a revision.',
        position: 'top',
      });
      return;
    }

    const formDataIsValid = portalFormSchema.safeParse(data);

    if (!formDataIsValid.success) {
      console.error('Validation failed:', formDataIsValid.error);
      return;
    } else {
      const newFormData = new FormData();

      Object.entries(data)
        .filter(
          ([, value]) =>
            value !== undefined &&
            value !== null &&
            value !== '' &&
            String(value) !== 'null'
        )
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

      newFormData.append('user_id', user.id);

      setIsLoading(true);

      try {
        const { data } = await apiClient.post(
          `/requests/${requestToRevise.id}/revisions`,
          newFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setRootId(data.request.root_request_id || data.request.id);

        if (!user || !rootId) {
          setIsLoading(false);
          return;
        }

        // Action record is now automatically created by the backend when revision is submitted
        setIsLoading(false);
        submissionModalOnOpen();
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false);
        toast({
          status: 'error',
          title: 'Submission Failed',
          description:
            'There was a problem submitting the revision. Please contact your system administrator.',
          position: 'top',
        });
      }
    }
  };

  return (
    <>
      <FormContainer
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onSubmitHandler={onSubmit}
        request={requestToRevise}
        headerText={'Revise Request'}
        isEditingDraft={true}
      />
      <ConfirmationModal
        isOpen={submissionModalIsOpen}
        onClose={handleSubmissionModalClose}
        handleContinueClick={handleSubmissionModalClose}
        title="Revision Submitted"
        continueBtnText="OK"
        bodyContent={
          <Box w="100">
            <Text>
              {`Revision has been submitted successfully for request ${rootId ? formatRequestId(rootId) : 'Request Id not found'}`}
            </Text>
          </Box>
        }
      />
    </>
  );
};
