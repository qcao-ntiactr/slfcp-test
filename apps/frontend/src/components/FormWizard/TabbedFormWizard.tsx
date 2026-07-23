import {
  Box,
  Button,
  Flex,
  Heading,
  Tab,
  TabList,
  Tabs,
  Text,
} from '@chakra-ui/react';
import {
  Fragment,
  PropsWithChildren,
  ReactNode,
  useRef,
  useState,
} from 'react';
import {
  FieldErrors,
  FieldPath,
  FieldValues,
  get,
  useFormContext,
} from 'react-hook-form';
import { Wizard, useWizard } from 'react-use-wizard';
import { z } from 'zod';

export interface FormWizardStep<TValues extends FieldValues> {
  id: string;
  title: string;
  content: ReactNode;
  validation?: {
    fields: readonly FieldPath<TValues>[];
    schema: z.ZodTypeAny;
  };
  contentPadding?: number | string;
}

interface FormWizardProgress {
  activeStep: number;
  highestVisitedStep: number;
}

interface SecondaryAction {
  label: string;
  onClick: () => void;
  isVisible?: boolean;
  isDisabled?: boolean;
}

interface TabbedFormWizardProps<TValues extends FieldValues> {
  headerText: string;
  steps: readonly FormWizardStep<TValues>[];
  isSubmitting: boolean;
  onCancel: () => void;
  navigationBlocked?: boolean;
  onProgressChange?: (_progress: FormWizardProgress) => void;
  secondaryAction?: SecondaryAction;
  submitLabel?: string;
}

interface TabbedFormWizardLayoutProps<TValues extends FieldValues> extends Omit<
  TabbedFormWizardProps<TValues>,
  'onProgressChange'
> {
  highestVisitedStep: number;
}

const stepHasErrors = <TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  step: FormWizardStep<TValues>
) =>
  Boolean(
    step.validation?.fields.some((field) => get(errors, field) !== undefined) ||
    (step.id === 'frequencies' &&
      Object.keys(errors).some((field) => field.startsWith('frequencies')))
  );

const WizardTab = ({
  isInvalid,
  title,
  isDisabled,
}: {
  isInvalid: boolean;
  title: string;
  isDisabled: boolean;
}) => (
  <Tab
    fontWeight="bold"
    color={isInvalid ? 'red.600' : undefined}
    isDisabled={isDisabled}
    pt={5}
    pb={3}
  >
    {isInvalid ? <Text mr={3}>{title}</Text> : title}
  </Tab>
);

const TabbedFormWizardLayout = <TValues extends FieldValues>({
  children,
  headerText,
  highestVisitedStep,
  isSubmitting,
  navigationBlocked = false,
  onCancel,
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
    clearErrors,
    formState: { errors },
    getValues,
    setError,
    trigger,
  } = useFormContext<TValues>();

  const activeContent = steps[activeStep];
  const schemaErrorPaths = useRef<FieldPath<TValues>[]>([]);

  const validateActiveStep = async () => {
    if (!activeContent.validation) return;

    clearErrors(schemaErrorPaths.current);
    schemaErrorPaths.current = [];

    const fieldsValid = await trigger([...activeContent.validation.fields], {
      shouldFocus: true,
    });
    const result = activeContent.validation.schema.safeParse(getValues());

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        if (issue.path.length === 0) return;
        const issuePath = issue.path.join('.') as FieldPath<TValues>;
        setError(issuePath, {
          type: 'validation',
          message: issue.message,
        });
        schemaErrorPaths.current.push(issuePath);
      });
    }

    if (!fieldsValid || !result.success) {
      throw new Error('Step validation failed');
    }
  };

  handleStep(validateActiveStep);

  const handleTabChange = (nextIndex: number) => {
    if (navigationBlocked || nextIndex === activeStep) return;

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
          {steps.map((step, index) => (
            <WizardTab
              key={step.id}
              title={step.title}
              isInvalid={
                index <= highestVisitedStep && stepHasErrors(errors, step)
              }
              isDisabled={
                navigationBlocked ||
                (index > activeStep + 1 && index > highestVisitedStep)
              }
            />
          ))}
        </TabList>

        <Box role="tabpanel" p={activeContent.contentPadding}>
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
              disabled={isLoading || secondaryAction.isDisabled}
            >
              {secondaryAction.label}
            </Button>
          )}

          {!isLastStep ? (
            <Button
              type="button"
              className="forward-submit-btn"
              disabled={navigationBlocked || isLoading}
              onClick={() => {
                void nextStep().catch(() => undefined);
              }}
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

export const TabbedFormWizard = <TValues extends FieldValues>({
  onProgressChange,
  steps,
  ...layoutProps
}: TabbedFormWizardProps<TValues>) => {
  const [highestVisitedStep, setHighestVisitedStep] = useState(0);
  const highestVisitedStepRef = useRef(0);

  const handleStepChange = (activeStep: number) => {
    const nextHighestVisitedStep = Math.max(
      highestVisitedStepRef.current,
      activeStep
    );
    highestVisitedStepRef.current = nextHighestVisitedStep;
    setHighestVisitedStep(nextHighestVisitedStep);
    onProgressChange?.({
      activeStep,
      highestVisitedStep: nextHighestVisitedStep,
    });
  };

  return (
    <Wizard
      onStepChange={handleStepChange}
      wrapper={
        <TabbedFormWizardLayout
          {...layoutProps}
          highestVisitedStep={highestVisitedStep}
          steps={steps}
        />
      }
    >
      {steps.map((step) => (
        <Fragment key={step.id}>{step.content}</Fragment>
      ))}
    </Wizard>
  );
};
