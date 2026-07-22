import {
  Box,
  Button,
  Flex,
  Heading,
  TabList,
  Tabs,
} from '@chakra-ui/react';
import { PortalFormDefaults, requestWizardSteps } from '@slfcp/validation';
import { PropsWithChildren } from 'react';
import { FieldErrors, Path, get, useFormContext } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';

import { FormNavButton } from '../Buttons/FormNavButton';
import { TabHeader } from '../TabContents';

const wizardSteps = requestWizardSteps();

const REQUEST_WIZARD_STEP_CONTENT = [
  {
    id: 'launchSite',
    title: 'Launch Site',
    validation: wizardSteps.launchSite,
  },
  {
    id: 'frequencies',
    title: 'Frequencies',
    validation: wizardSteps.frequencies,
  },
  {
    id: 'additionalInformation',
    title: 'Additional Information',
    validation: wizardSteps.additionalInformation,
  },
  {
    id: 'summary',
    title: 'Summary',
    validation: undefined,
  },
] as const;

type VisitedRequestTabs = Record<number, boolean>;

export const getVisitedRequestTabs = (
  highestVisitedStep: number
): VisitedRequestTabs => ({
  0: true,
  1: highestVisitedStep >= 1,
  2: highestVisitedStep >= 2,
  3: highestVisitedStep >= 3,
});

const stepHasErrors = (
  errors: FieldErrors<PortalFormDefaults>,
  stepIndex: number
) => {
  const validation = REQUEST_WIZARD_STEP_CONTENT[stepIndex]?.validation;
  return Boolean(
    validation?.fields.some((field) => get(errors, field) !== undefined)
  );
};

interface RequestWizardLayoutProps extends PropsWithChildren {
  headerText: string;
  highestVisitedStep: number;
  isEditingFrequency: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onRequestSaveDraft: () => void;
  showSaveDraft: boolean;
}

export const RequestWizardLayout = ({
  children,
  headerText,
  highestVisitedStep,
  isEditingFrequency,
  isSubmitting,
  onCancel,
  onRequestSaveDraft,
  showSaveDraft,
}: RequestWizardLayoutProps) => {
  const {
    activeStep,
    goToStep,
    handleStep,
    isFirstStep,
    isLastStep,
    isLoading,
    nextStep,
    previousStep,
  } = useWizard();
  const {
    formState: { errors },
    getValues,
    setError,
    trigger,
  } = useFormContext<PortalFormDefaults>();

  const activeContent = REQUEST_WIZARD_STEP_CONTENT[activeStep];

  const validateActiveStep = async () => {
    if (!activeContent.validation) return;

    const fields = activeContent.validation
      .fields as Path<PortalFormDefaults>[];
    const fieldsValid = await trigger(fields, { shouldFocus: true });
    const result = activeContent.validation.schema.safeParse(getValues());

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        if (issue.path.length === 0) return;
        setError(issue.path.join('.') as Path<PortalFormDefaults>, {
          type: 'validation',
          message: issue.message,
        });
      });
    }

    if (!fieldsValid || !result.success) {
      throw new Error('Step validation failed');
    }
  };

  handleStep(validateActiveStep);

  const handleTabChange = (nextIndex: number) => {
    if (isEditingFrequency || nextIndex === activeStep) return;

    if (nextIndex < activeStep) {
      goToStep(nextIndex);
      return;
    }

    if (nextIndex === activeStep + 1) {
      void nextStep().catch(() => undefined);
      return;
    }

    if (nextIndex <= highestVisitedStep) {
      void validateActiveStep()
        .then(() => goToStep(nextIndex))
        .catch(() => undefined);
    }
  };

  return (
    <Box w="100%" borderRadius="6px 6px 0 0" border="solid 1px #1322951A">
      <Heading
        backgroundColor="gray.100"
        textAlign="left"
        borderRadius="inherit"
        fontSize="22px"
        padding="16px"
      >
        {headerText}
      </Heading>

      <Tabs index={activeStep} onChange={handleTabChange} isFitted>
        <TabList justifyContent="space-evenly">
          {REQUEST_WIZARD_STEP_CONTENT.map((step, index) => (
            <TabHeader
              key={step.id}
              tabName={step.title}
              isInvalid={
                index <= highestVisitedStep && stepHasErrors(errors, index)
              }
              disabled={
                isEditingFrequency ||
                (index > activeStep + 1 && index > highestVisitedStep)
              }
            />
          ))}
        </TabList>

        <Box role="tabpanel" p={activeStep === 3 ? undefined : 0}>
          {children}
        </Box>
      </Tabs>

      <Flex flexDir="row" justifyContent="space-between" padding="18px">
        <FormNavButton
          clickHandler={isFirstStep ? onCancel : previousStep}
          label={isFirstStep ? 'Cancel' : 'Back'}
          backgroundColor="white"
          disabled={isEditingFrequency || isLoading}
        />
        <Flex gap={3}>
          {showSaveDraft && (
            <FormNavButton
              clickHandler={onRequestSaveDraft}
              label="Save Draft"
              backgroundColor="white"
              border="1px #4a5568 solid"
              disabled={isLoading}
            />
          )}

          {!isLastStep ? (
            <FormNavButton
              className="forward-submit-btn"
              disabled={isEditingFrequency || isLoading}
              clickHandler={() => {
                void nextStep().catch(() => undefined);
              }}
              label={REQUEST_WIZARD_STEP_CONTENT[activeStep + 1].title}
              backgroundColor="#4a5568"
              _hover={{ bg: 'blackAlpha.700' }}
              color="white"
            />
          ) : (
            <Button
              type="submit"
              _hover={{ bg: 'blackAlpha.700' }}
              className="forward-submit-btn"
              isDisabled={Object.keys(errors).length > 0 || isSubmitting}
              w="sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};
