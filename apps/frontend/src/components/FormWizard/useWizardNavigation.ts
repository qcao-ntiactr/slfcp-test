import type { MouseEvent } from 'react';

import { WizardStepValidationError } from './useWizardStepValidation.ts';

interface UseWizardNavigationOptions {
  activeStep: number;
  goToStep: (_step: number) => void;
  highestVisitedStep: number;
  navigationBlocked: boolean;
  nextStep: () => Promise<void>;
  validateActiveStep: () => Promise<void>;
}

const runValidatedNavigation = async (
  navigate: () => Promise<void>
): Promise<void> => {
  try {
    await navigate();
  } catch (error) {
    if (!(error instanceof WizardStepValidationError)) {
      throw error;
    }
  }
};

export const useWizardNavigation = ({
  activeStep,
  goToStep,
  highestVisitedStep,
  navigationBlocked,
  nextStep,
  validateActiveStep,
}: UseWizardNavigationOptions) => {
  const goForward = (_event?: MouseEvent<HTMLButtonElement>) => {
    void runValidatedNavigation(nextStep);
  };

  const changeTab = (nextStepIndex: number) => {
    if (navigationBlocked || nextStepIndex === activeStep) return;

    if (nextStepIndex < activeStep) {
      goToStep(nextStepIndex);
      return;
    }

    if (nextStepIndex === activeStep + 1) {
      goForward();
      return;
    }

    if (nextStepIndex <= highestVisitedStep) {
      void runValidatedNavigation(async () => {
        await validateActiveStep();
        goToStep(nextStepIndex);
      });
    }
  };

  return { changeTab, goForward };
};
