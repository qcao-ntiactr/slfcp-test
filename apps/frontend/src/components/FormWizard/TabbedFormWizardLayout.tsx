import {
  Box,
  Button,
  Flex,
  Heading,
  TabList,
  Tabs,
  Text,
} from '@chakra-ui/react';
import type { PropsWithChildren } from 'react';
import { get, useFormContext } from 'react-hook-form';
import type { FieldErrors, FieldValues } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';

import type {
  FormWizardStep,
  TabbedFormWizardProps,
} from './TabbedFormWizard.tsx';
import { useWizardNavigation } from './useWizardNavigation.ts';
import { useWizardStepValidation } from './useWizardStepValidation.ts';
import { WizardTab } from './WizardTab.tsx';

export interface TabbedFormWizardLayoutProps<
  TValues extends FieldValues,
> extends Omit<TabbedFormWizardProps<TValues>, 'onProgressChange'> {
  highestVisitedStep: number;
}

const stepHasErrors = <TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  step: FormWizardStep<TValues>
) =>
  Boolean(
    step.validation?.fields.some((field) => get(errors, field) !== undefined) ||
    get(errors, `root.wizardStepValidation.${step.id}`) !== undefined
  );

const hasBlockingFieldError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  if ('type' in error && typeof error.type === 'string') {
    return error.type !== 'validation';
  }

  return Object.values(error).some(hasBlockingFieldError);
};

const stepHasBlockingFieldErrors = <TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  step: FormWizardStep<TValues>
) =>
  Boolean(
    step.validation?.fields.some((field) =>
      hasBlockingFieldError(get(errors, field))
    )
  );

export const TabbedFormWizardLayout = <TValues extends FieldValues>({
  children,
  forwardNavigationBlocked = false,
  headerText,
  highestVisitedStep,
  isSubmitting,
  navigationBlocked = false,
  onCancel,
  onHeaderClick,
  secondaryAction,
  steps,
  submitLabel = 'Submit',
}: PropsWithChildren<TabbedFormWizardLayoutProps<TValues>>) => {
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
  } = useFormContext<TValues>();

  const activeStepConfig = steps[activeStep];
  const activeStepRootError = get(
    errors,
    `root.wizardStepValidation.${activeStepConfig.id}.message`
  );
  const activeStepHasErrors = stepHasErrors(errors, activeStepConfig);
  const activeStepCannotAdvance =
    activeStepHasErrors || forwardNavigationBlocked;
  const forwardButtonIsDisabled =
    forwardNavigationBlocked ||
    stepHasBlockingFieldErrors(errors, activeStepConfig);
  const validateActiveStep = useWizardStepValidation(activeStepConfig);

  handleStep(validateActiveStep);

  const { changeTab, goForward } = useWizardNavigation({
    activeStep,
    forwardNavigationBlocked,
    goToStep,
    highestVisitedStep,
    navigationBlocked,
    nextStep,
    validateActiveStep,
  });

  return (
    <Box w="100%" borderRadius="6px 6px 0 0" border="solid 1px #1322951A">
      <Heading
        backgroundColor="gray.100"
        textAlign="left"
        borderRadius="inherit"
        fontSize="22px"
        padding="16px"
      >
        {onHeaderClick ? (
          <Button
            type="button"
            variant="unstyled"
            fontSize="inherit"
            fontWeight="inherit"
            onClick={onHeaderClick}
          >
            {headerText}
          </Button>
        ) : (
          headerText
        )}
      </Heading>

      <Tabs index={activeStep} onChange={changeTab} isFitted>
        <TabList justifyContent="space-evenly">
          {steps.map((step, index) => (
            <WizardTab
              key={step.id}
              title={step.title}
              isInvalid={
                index <= highestVisitedStep && stepHasErrors(errors, step)
              }
              isDisabled={
                navigationBlocked ||
                (index > activeStep && activeStepCannotAdvance) ||
                (index > activeStep + 1 && index > highestVisitedStep)
              }
            />
          ))}
        </TabList>

        <Box role="tabpanel" p={activeStepConfig.contentPadding}>
          {typeof activeStepRootError === 'string' && (
            <Text role="alert" color="red.600" px={4} pt={4}>
              {activeStepRootError}
            </Text>
          )}
          {children}
        </Box>
      </Tabs>

      <Flex flexDir="row" justifyContent="space-between" padding="18px">
        <Button
          type="button"
          onClick={isFirstStep ? onCancel : previousStep}
          w="2xs"
          backgroundColor="white"
          disabled={navigationBlocked || isLoading}
        >
          {isFirstStep ? 'Cancel' : 'Back'}
        </Button>

        <Flex gap={3}>
          {secondaryAction && secondaryAction.isVisible !== false && (
            <Button
              type="button"
              onClick={secondaryAction.onClick}
              w="2xs"
              backgroundColor="white"
              border="1px #4a5568 solid"
              disabled={
                navigationBlocked || isLoading || secondaryAction.isDisabled
              }
            >
              {secondaryAction.label}
            </Button>
          )}

          {!isLastStep ? (
            <Button
              type="button"
              className="forward-submit-btn"
              disabled={
                navigationBlocked || forwardButtonIsDisabled || isLoading
              }
              onClick={goForward}
              w="2xs"
              backgroundColor="#4a5568"
              _hover={{ bg: 'blackAlpha.700' }}
              color="white"
            >
              {steps[activeStep + 1].title}
            </Button>
          ) : (
            <Button
              type="submit"
              _hover={{ bg: 'blackAlpha.700' }}
              className="forward-submit-btn"
              isDisabled={Object.keys(errors).length > 0 || isSubmitting}
              w="sm"
            >
              {isSubmitting ? 'Submitting...' : submitLabel}
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};
