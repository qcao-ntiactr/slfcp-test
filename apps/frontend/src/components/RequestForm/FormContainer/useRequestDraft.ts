import { useToast } from '@chakra-ui/react';
import type { PortalFormDefaults } from '@slfcp/validation';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  submitDraft,
  updateDraft,
  type RequestDraftHeaders,
} from '../../../api/RequestDrafts.ts';
import {
  useHybridAuth,
  UserRole,
} from '../../../context/HybridAuthContext.tsx';
import type { EntityType } from '../utils/Helpers.ts';

import { createRequestDraftFormData } from './requestDraftFormData.ts';

interface UseRequestDraftOptions {
  draftId?: number;
  isEditingDraft: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

const getEntityType = (userRole: UserRole): EntityType => {
  switch (userRole) {
    case UserRole.commercial:
      return 'COMMERCIAL';
    case UserRole.federal:
      return 'FEDERAL_AGENCY';
    case UserRole.ntia:
      return 'NTIA';
  }
};

export const useRequestDraft = ({
  draftId,
  isEditingDraft,
  setIsLoading,
}: UseRequestDraftOptions) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useHybridAuth();

  const saveDraft = async (values: PortalFormDefaults) => {
    if (!user) return false;

    const headers: RequestDraftHeaders = {
      userId: user.id,
      userName: user.displayName,
      userType: getEntityType(user.role),
    };

    setIsLoading(true);

    try {
      const formData = createRequestDraftFormData(values);

      if (isEditingDraft && draftId !== undefined) {
        await updateDraft(draftId, formData, headers);
        toast({
          status: 'success',
          title: 'Draft Updated',
          description: 'Your draft has been updated successfully.',
          position: 'top-left',
          isClosable: true,
        });
      } else {
        await submitDraft(formData, headers);
        toast({
          status: 'success',
          title: 'Draft Saved',
          description:
            'Your request has been saved as a draft. You can return to complete and submit it at any time.',
          position: 'top-left',
          isClosable: true,
        });
      }

      navigate('/');
      return true;
    } catch (error) {
      console.error('Something went wrong with the draft operation', error);
      toast({
        status: 'error',
        title: 'Draft Save Failed',
        description:
          'There was a problem saving your draft. Please try again or contact your system administrator.',
        position: 'top',
        isClosable: true,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { saveDraft };
};
