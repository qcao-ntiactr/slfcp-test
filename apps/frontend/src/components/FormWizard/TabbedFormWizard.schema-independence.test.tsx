/**
 * @vitest-environment jsdom
 */
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { describe, it, vi } from 'vitest';
import { z } from 'zod';

import type { FormWizardStep } from './TabbedFormWizard.tsx';
import { TabbedFormWizard } from './TabbedFormWizard.tsx';

interface SurveyValues {
  profile?: { name?: string };
  consent?: string;
}

const SurveyProfile = () => {
  const { register } = useFormContext<SurveyValues>();
  return <input aria-label="Survey name" {...register('profile.name')} />;
};

const SurveyConsent = () => {
  const { register } = useFormContext<SurveyValues>();
  return <input aria-label="Consent" {...register('consent')} />;
};

const SurveyWizard = () => {
  const methods = useForm<SurveyValues>();
  const steps: readonly FormWizardStep<SurveyValues>[] = [
    {
      id: 'profile',
      title: 'Profile',
      content: <SurveyProfile />,
      validation: {
        fields: ['profile'],
        schema: z.object({
          profile: z.object({ name: z.string().min(1) }),
        }),
      },
    },
    {
      id: 'consent',
      title: 'Consent',
      content: <SurveyConsent />,
      validation: {
        fields: ['consent'],
        schema: z.object({ consent: z.literal('yes') }),
      },
    },
    {
      id: 'complete',
      title: 'Complete',
      content: <div>Survey complete</div>,
    },
  ];

  return (
    <ChakraProvider>
      <FormProvider {...methods}>
        <form>
          <TabbedFormWizard
            headerText="Survey"
            steps={steps}
            isSubmitting={false}
            onCancel={vi.fn()}
          />
        </form>
      </FormProvider>
    </ChakraProvider>
  );
};

describe('TabbedFormWizard schema independence', () => {
  it('runs a differently shaped form with unrelated step IDs and nested fields', async () => {
    const user = userEvent.setup();
    render(<SurveyWizard />);

    await user.type(screen.getByLabelText('Survey name'), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Consent' }));
    await user.type(screen.getByLabelText('Consent'), 'yes');
    await user.click(screen.getByRole('button', { name: 'Complete' }));

    await screen.findByText('Survey complete');
  });
});
