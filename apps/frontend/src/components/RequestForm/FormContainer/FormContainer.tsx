import { Box, Text, useDisclosure, useToast } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import {
  FrequencyFormDefaults,
  PortalFormDefaults,
  frequencyFormSchema,
  portalFormSchema,
  requestWizardSteps,
} from '@slfcp/validation';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestDetails } from 'apps/frontend/src/types.ts';

import {
  defaultValues,
  frequencyFormDefaultValues,
} from '../utils/DefaultValues.ts';
import { getNonRequiredErrors, EntityType } from '../utils/Helpers.ts';
import { LaunchSiteTab } from '../TabContents/LaunchSiteTab';
import { AdditionalInformationTab } from '../TabContents/AdditionalInformationTab';
import { useConfirmNavigationModal } from '../../../context/ConfirmNavigationModalContext.tsx';
import { FrequenciesTab, SummaryTab } from '../TabContents/index.ts';
import {
  submitDraft,
  updateDraft,
  RequestDraftHeaders,
} from '../../../api/RequestDrafts.ts';
import { useHybridAuth, UserRole } from '../../../context/HybridAuthContext';
import { ConfirmationModal } from '../ConfirmationModal.tsx';
import { InvalidFieldsWarning } from '../InvalidFieldsWarning/InvalidFieldsWarning.tsx';
import {
  FormWizardStep,
  TabbedFormWizard,
} from '../../FormWizard/TabbedFormWizard.tsx';

export interface FormContainerProps {
  request?: Partial<RequestDetails>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  headerText: string;
  // eslint-disable-next-line no-unused-vars
  onSubmitHandler: (data: PortalFormDefaults) => Promise<void>;
  // Draft editing props
  draftId?: number;
  isEditingDraft?: boolean;
}
export const FormContainer = ({
  request,
  isLoading,
  setIsLoading,
  headerText,
  onSubmitHandler,
  draftId,
  isEditingDraft = false,
}: FormContainerProps) => {
  const wizardSteps = useMemo(() => requestWizardSteps(), []);
  const methods = useForm<PortalFormDefaults>({
    resolver: zodResolver(portalFormSchema),
    defaultValues: request ?? defaultValues,
    mode: 'all',
    reValidateMode: 'onChange',
  });
  const frequencyFormMethods = useForm<FrequencyFormDefaults>({
    resolver: zodResolver(frequencyFormSchema),
    defaultValues: frequencyFormDefaultValues,
    mode: 'onChange',
  });

  const [activeStep, setActiveStep] = useState(0);
  const [highestVisitedStep, setHighestVisitedStep] = useState(0);

  const [isEditingFrequency, setIsEditingFrequency] = useState(false);

  const { getValues, handleSubmit, trigger, control, reset } = methods;

  const { errors } = useFormState({ control: control });

  const { openConfirmNavigationModal, setNextRoute } =
    useConfirmNavigationModal();

  const navigate = useNavigate();

  const { user } = useHybridAuth();

  useEffect(() => {
    if (request) {
      reset(request);
    }

    void trigger(wizardSteps.launchSite.fields);
  }, [request, reset, trigger]);

  const {
    isOpen: saveDraftModalIsOpen,
    onClose: saveDraftModalOnClose,
    onOpen: saveDraftModalOnOpen,
  } = useDisclosure();

  const {
    isOpen: validationFailedModalIsOpen,
    onClose: validationFailedModalOnClose,
    onOpen: validationFailedModalOnOpen,
  } = useDisclosure();

  const allInvalidFields = getNonRequiredErrors(errors);
  const visitedTabs = {
    0: true,
    1: highestVisitedStep >= 1,
    2: highestVisitedStep >= 2,
    3: highestVisitedStep >= 3,
  };

  const isFrequencyField = (fieldKey: string) =>
    (wizardSteps.frequencies.fields as readonly string[]).includes(fieldKey) ||
    fieldKey.startsWith('frequencies');

  const applicableInvalidFields = allInvalidFields.filter((f) => {
    if (
      wizardSteps.launchSite.fields.includes(
        f.fieldKey as (typeof wizardSteps.launchSite.fields)[number]
      )
    )
      return visitedTabs[0];
    if (isFrequencyField(f.fieldKey)) return visitedTabs[1];
    if (
      wizardSteps.additionalInformation.fields.includes(
        f.fieldKey as (typeof wizardSteps.additionalInformation.fields)[number]
      )
    )
      return visitedTabs[2];
    return true;
  });
  const invalidFieldsExist = applicableInvalidFields.length > 0;
  const exclusivelyFrequencyInvalidFields =
    invalidFieldsExist &&
    applicableInvalidFields.every((field) => isFrequencyField(field.fieldKey));

  const toast = useToast();

  /**
   * Handles form cancel button press
   */
  const handleCancelButtonClick = () => {
    setNextRoute('/');
    openConfirmNavigationModal();
  };

  const convertUserRoleToEntityType = (userRole: UserRole): EntityType => {
    switch (userRole) {
      case UserRole.commercial:
        return 'COMMERCIAL';
      case UserRole.federal:
        return 'FEDERAL_AGENCY';
      case UserRole.ntia:
        return 'NTIA';
    }
  };

  const handleSaveDraft = async (data: PortalFormDefaults) => {
    if (!user) return;

    const headers: RequestDraftHeaders = {
      userId: user.id,
      userName: user.displayName,
      userType: convertUserRoleToEntityType(user.role),
    };

    // Fields that should not be included in draft updates
    const excludeFields = ['id', 'createdAt', 'updatedAt', 'user'];

    const newFormData = new FormData();

    Object.entries(data)
      .filter(([key, value]) => {
        const isClearedFccFilingDate =
          key === 'fcc_filing_date' && value === '';

        return (
          isClearedFccFilingDate ||
          (value !== undefined &&
            value !== null &&
            value !== '' &&
            String(value) !== 'null' &&
            !excludeFields.includes(key))
        );
      })
      .forEach(([key, value]) => {
        if (value instanceof File || value instanceof Blob) {
          // Handles file fields
          newFormData.append(key, value);
        } else if (Array.isArray(value)) {
          // Handles the frequencies array
          newFormData.append(key, JSON.stringify(value));
        } else if (key === 'fcc_filing_date' && value === '') {
          // Keep explicit clears when updating drafts.
          newFormData.append(key, 'null');
        } else {
          // Handles the rest of the fields
          newFormData.append(key, String(value));
        }
      });

    setIsLoading(true);

    try {
      if (isEditingDraft && draftId !== undefined) {
        // Update existing draft
        await updateDraft(draftId, newFormData, headers);
        toast({
          status: 'success',
          title: 'Draft Updated',
          description: 'Your draft has been updated successfully.',
          position: 'top-left',
          isClosable: true,
        });
      } else {
        // Create new draft
        await submitDraft(newFormData, headers);
        toast({
          status: 'success',
          title: 'Draft Saved',
          description:
            'You request has been saved as a draft. You can return to complete and submit it at any time.',
          position: 'top-left',
          isClosable: true,
        });
      }
      navigate('/');
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
      saveDraftModalOnClose();
    } finally {
      setIsLoading(false);
    }
  };

  const requestFormSteps: readonly FormWizardStep<PortalFormDefaults>[] = [
    {
      id: 'launch-site',
      title: 'Launch Site',
      content: <LaunchSiteTab />,
      contentPadding: 0,
      validation: wizardSteps.launchSite,
    },
    {
      id: 'frequencies',
      title: 'Frequencies',
      content: (
        <FrequenciesTab
          frequencyFormMethods={frequencyFormMethods}
          isEditingFrequency={isEditingFrequency}
          setIsEditingFrequency={setIsEditingFrequency}
        />
      ),
      contentPadding: 0,
      validation: wizardSteps.frequencies,
    },
    {
      id: 'additional-information',
      title: 'Additional Information',
      content: <AdditionalInformationTab />,
      contentPadding: 0,
      validation: wizardSteps.additionalInformation,
    },
    {
      id: 'summary',
      title: 'Summary',
      content: <SummaryTab />,
      contentPadding: 0,
    },
  ];

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmitHandler)}
        method="post"
        encType="multipart/form-data"
      >
        <TabbedFormWizard
          headerText={headerText}
          steps={requestFormSteps}
          isSubmitting={isLoading}
          navigationBlocked={isEditingFrequency}
          onCancel={handleCancelButtonClick}
          onProgressChange={({
            activeStep: nextActiveStep,
            highestVisitedStep: nextHighestVisitedStep,
          }) => {
            setActiveStep(nextActiveStep);
            setHighestVisitedStep(nextHighestVisitedStep);
          }}
          secondaryAction={{
            label: 'Save Draft',
            isVisible: draftId !== undefined || !request?.id,
            onClick: () => {
              if (
                invalidFieldsExist &&
                !(activeStep === 1 && exclusivelyFrequencyInvalidFields)
              ) {
                validationFailedModalOnOpen();
              } else {
                saveDraftModalOnOpen();
              }
            },
          }}
        />
      </form>
      <InvalidFieldsWarning
        isOpen={validationFailedModalIsOpen}
        onClose={validationFailedModalOnClose}
        invalidFields={allInvalidFields}
        visitedTabs={visitedTabs}
      />
      <ConfirmationModal
        includeCancel={true}
        isOpen={saveDraftModalIsOpen}
        onClose={saveDraftModalOnClose}
        continueBtnText="Save Draft"
        continueDisabled={isLoading}
        title="Save Draft?"
        bodyContent={
          <Box>
            <Text mb="3">
              Are you sure you want to save this request as a draft? You'll be
              able to return later to complete and submit it.
            </Text>
            {activeStep === 1 && (
              <Text fontSize="sm" color="gray.600">
                <strong>Note:</strong> For a frequency's metadata to be stored
                in the draft, all fields for that frequency must be completed.
                Frequencies with incomplete metadata will not be saved. Click
                "Add Frequency" for the metadata to be stored in the draft.
              </Text>
            )}
          </Box>
        }
        handleContinueClick={() => {
          void handleSaveDraft(getValues());
        }}
      />
    </FormProvider>
  );
};
