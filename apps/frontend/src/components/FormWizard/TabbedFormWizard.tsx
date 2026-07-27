import { Fragment, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { Wizard } from 'react-use-wizard';
import type { z } from 'zod';

import { TabbedFormWizardLayout } from './TabbedFormWizardLayout.tsx';

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

export interface TabbedFormWizardProps<TValues extends FieldValues> {
  headerText: string;
  steps: readonly FormWizardStep<TValues>[];
  isSubmitting: boolean;
  onCancel: () => void;
  forwardNavigationBlocked?: boolean;
  navigationBlocked?: boolean;
  onProgressChange?: (_progress: FormWizardProgress) => void;
  secondaryAction?: SecondaryAction;
  submitLabel?: string;
}

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
