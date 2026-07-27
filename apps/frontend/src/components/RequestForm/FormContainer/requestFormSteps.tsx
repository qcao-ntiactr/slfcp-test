import type {
  FrequencyFormDefaults,
  PortalFormDefaults,
  requestWizardSteps,
} from '@slfcp/validation';
import type { Dispatch, SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { FormWizardStep } from '../../FormWizard/TabbedFormWizard.tsx';
import { AdditionalInformationTab } from '../TabContents/AdditionalInformationTab';
import { FrequenciesTab } from '../TabContents/FrequenciesTab/FrequenciesTab.tsx';
import { LaunchSiteTab } from '../TabContents/LaunchSiteTab';
import { SummaryTab } from '../TabContents/SummaryTab';

export const REQUEST_FORM_STEP_INDEX = {
  launchSite: 0,
  frequencies: 1,
  additionalInformation: 2,
  summary: 3,
} as const;

interface CreateRequestFormStepsOptions {
  frequencyFormMethods: UseFormReturn<FrequencyFormDefaults>;
  isEditingFrequency: boolean;
  onFrequencyEditorVisibilityChange: (_isVisible: boolean) => void;
  setIsEditingFrequency: Dispatch<SetStateAction<boolean>>;
  validation: ReturnType<typeof requestWizardSteps>;
}

export const createRequestFormSteps = ({
  frequencyFormMethods,
  isEditingFrequency,
  onFrequencyEditorVisibilityChange,
  setIsEditingFrequency,
  validation,
}: CreateRequestFormStepsOptions): readonly FormWizardStep<PortalFormDefaults>[] => [
  {
    id: 'launch-site',
    title: 'Launch Site',
    content: <LaunchSiteTab />,
    contentPadding: 0,
    validation: validation.launchSite,
  },
  {
    id: 'frequencies',
    title: 'Frequencies',
    content: (
      <FrequenciesTab
        frequencyFormMethods={frequencyFormMethods}
        isEditingFrequency={isEditingFrequency}
        onEditorVisibilityChange={onFrequencyEditorVisibilityChange}
        setIsEditingFrequency={setIsEditingFrequency}
      />
    ),
    contentPadding: 0,
    validation: validation.frequencies,
  },
  {
    id: 'additional-information',
    title: 'Additional Information',
    content: <AdditionalInformationTab />,
    contentPadding: 0,
    validation: validation.additionalInformation,
  },
  {
    id: 'summary',
    title: 'Summary',
    content: <SummaryTab />,
    contentPadding: 0,
  },
];
