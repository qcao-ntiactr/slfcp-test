import { Box, Text, useDisclosure } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import {
  FrequencyFormDefaults,
  PortalFormDefaults,
  frequencyFormSchema,
  portalFormSchema,
  requestWizardSteps,
} from '@slfcp/validation';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { RequestDetails } from 'apps/frontend/src/types.ts';

import {
  defaultValues,
  frequencyFormDefaultValues,
} from '../utils/DefaultValues.ts';
import { getNonRequiredErrors } from '../utils/Helpers.ts';
import { useConfirmNavigationModal } from '../../../context/ConfirmNavigationModalContext.tsx';
import { ConfirmationModal } from '../ConfirmationModal.tsx';
import { InvalidFieldsWarning } from '../InvalidFieldsWarning/InvalidFieldsWarning.tsx';
import { TabbedFormWizard } from '../../FormWizard/TabbedFormWizard.tsx';

import {
  createRequestFormSteps,
  REQUEST_FORM_STEP_INDEX,
} from './requestFormSteps.tsx';
import { getRequestValidationState } from './requestValidationState.ts';
import { useRequestDraft } from './useRequestDraft.ts';

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
  const requestStepValidation = useMemo(() => requestWizardSteps(), []);
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

  const [frequencyEditorIsVisible, setFrequencyEditorIsVisible] =
    useState(false);
  const [isEditingFrequency, setIsEditingFrequency] = useState(false);

  const { getValues, handleSubmit, trigger, control, reset } = methods;

  const { errors } = useFormState({ control: control });

  const { openConfirmNavigationModal, setNextRoute } =
    useConfirmNavigationModal();

  useEffect(() => {
    if (request) {
      reset(request);
    }

    void trigger(requestStepValidation.launchSite.fields);
  }, [request, requestStepValidation, reset, trigger]);

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
  const { hasInvalidFields, hasOnlyFrequencyErrors, visitedSteps } =
    getRequestValidationState({
      highestVisitedStep,
      invalidFields: allInvalidFields,
      validation: requestStepValidation,
    });

  const { saveDraft } = useRequestDraft({
    draftId,
    isEditingDraft,
    setIsLoading,
  });

  const handleCancelButtonClick = () => {
    setNextRoute('/');
    openConfirmNavigationModal();
  };

  const saveCurrentDraft = async () => {
    const draftWasSaved = await saveDraft(getValues());
    if (!draftWasSaved) {
      saveDraftModalOnClose();
    }
  };

  const requestFormSteps = useMemo(
    () =>
      createRequestFormSteps({
        frequencyFormMethods,
        isEditingFrequency,
        onFrequencyEditorVisibilityChange: setFrequencyEditorIsVisible,
        setIsEditingFrequency,
        validation: requestStepValidation,
      }),
    [frequencyFormMethods, isEditingFrequency, requestStepValidation]
  );

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
          forwardNavigationBlocked={
            activeStep === REQUEST_FORM_STEP_INDEX.frequencies &&
            frequencyEditorIsVisible
          }
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
                hasInvalidFields &&
                !(
                  activeStep === REQUEST_FORM_STEP_INDEX.frequencies &&
                  hasOnlyFrequencyErrors
                )
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
        visitedSteps={visitedSteps}
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
            {activeStep === REQUEST_FORM_STEP_INDEX.frequencies && (
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
          void saveCurrentDraft();
        }}
      />
    </FormProvider>
  );
};
