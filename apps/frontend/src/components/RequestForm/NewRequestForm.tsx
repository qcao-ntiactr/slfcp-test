import { Box, Text, useDisclosure, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalFormDefaults, portalFormSchema } from '@slfcp/validation';

import { formatRequestId } from '../utils/Helpers';
import { useHybridAuth } from '../../context/HybridAuthContext';
import apiClient from '../../api/axiosConfig';

import { ConfirmationModal } from './ConfirmationModal';
import { FormContainer } from './FormContainer/FormContainer';

export const NewRequestForm = () => {
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
   * Closes the modal and navigates to view requests page on successful form submission
   */
  const handleSubmissionModalClose = () => {
    submissionModalOnClose();
    navigate('/view-requests');
  };

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
        description: 'You must be logged in to submit a request.',
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
        .filter(([, value]) => value !== undefined) // Remove undefined values
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
        const { data } = await apiClient.post('/requests', newFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setIsLoading(false);
        setSubmittedRequestId(data.request.id);
        submissionModalOnOpen();
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false);
        toast({
          status: 'error',
          title: 'Submission Failed',
          description:
            'There was a problem submitting the form. Please contact your system administrator.',
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
        headerText="New Request"
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
