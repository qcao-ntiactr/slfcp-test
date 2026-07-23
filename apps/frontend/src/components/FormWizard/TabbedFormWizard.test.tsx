/**
 * @vitest-environment jsdom
 */
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormEvent, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { FormWizardStep, TabbedFormWizard } from './TabbedFormWizard.tsx';

interface TestFormValues {
  mission_name?: string;
  optional?: string;
  items?: { value?: string }[];
}

interface HarnessProps {
  defaultValues?: TestFormValues;
  isSubmitting?: boolean;
  navigationBlocked?: boolean;
  onCancel?: () => void;
  onProgressChange?: (_progress: {
    activeStep: number;
    highestVisitedStep: number;
  }) => void;
  onSubmit?: (_values: TestFormValues) => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    isVisible?: boolean;
    isDisabled?: boolean;
  };
  submitLabel?: string;
  wizardSteps?: readonly FormWizardStep<TestFormValues>[];
}

const LaunchContent = () => {
  const {
    formState: { errors },
    register,
  } = useFormContext<TestFormValues>();

  return (
    <label>
      Mission name
      <input
        {...register('mission_name')}
        aria-invalid={Boolean(errors.mission_name)}
      />
    </label>
  );
};

const FrequencyContent = () => {
  const {
    formState: { errors },
    register,
  } = useFormContext<TestFormValues>();

  return (
    <>
      <label>
        Optional value
        <input
          {...register('optional')}
          aria-invalid={Boolean(errors.optional)}
        />
      </label>
      <label>
        Item value
        <input
          {...register('items.0.value')}
          aria-invalid={Boolean(errors.items?.[0]?.value)}
        />
      </label>
    </>
  );
};

const requiredOptionalSchema = z.object({
  optional: z.string().min(1, 'Required'),
});

const steps: readonly FormWizardStep<TestFormValues>[] = [
  {
    id: 'launch',
    title: 'Launch Site',
    content: <LaunchContent />,
    validation: {
      fields: ['mission_name'],
      schema: z.object({
        mission_name: z.string().min(1, 'Required'),
      }),
    },
  },
  {
    id: 'radio-details',
    title: 'Frequencies',
    content: <FrequencyContent />,
    validation: {
      fields: ['optional'],
      schema: requiredOptionalSchema,
    },
  },
  {
    id: 'additional',
    title: 'Additional Information',
    content: <div>Additional content</div>,
    validation: {
      fields: ['optional'],
      schema: requiredOptionalSchema,
    },
  },
  {
    id: 'summary',
    title: 'Summary',
    content: <div>Summary content</div>,
  },
];

const nestedErrorSteps: readonly FormWizardStep<TestFormValues>[] = [
  steps[0],
  {
    ...steps[1],
    validation: {
      fields: ['optional', 'items'],
      schema: z
        .object({
          optional: z.string().min(1, 'Required'),
          items: z.array(z.object({ value: z.string().optional() })).optional(),
        })
        .superRefine((values, context) => {
          const itemValue = values.items?.[0]?.value;
          if (itemValue !== 'valid') {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid item',
              path: ['items', 0, 'value'],
            });
          }
        }),
    },
  },
  steps[2],
];

const Harness = ({
  defaultValues,
  isSubmitting = false,
  navigationBlocked = false,
  onCancel = vi.fn(),
  onProgressChange,
  onSubmit = vi.fn(),
  secondaryAction,
  submitLabel,
  wizardSteps = steps,
}: HarnessProps) => {
  const methods = useForm<TestFormValues>({ defaultValues });

  return (
    <ChakraProvider>
      <FormProvider {...methods}>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void methods.handleSubmit(onSubmit)(event);
          }}
        >
          <TabbedFormWizard
            headerText="Request"
            steps={wizardSteps}
            isSubmitting={isSubmitting}
            navigationBlocked={navigationBlocked}
            onCancel={onCancel}
            onProgressChange={onProgressChange}
            secondaryAction={secondaryAction}
            submitLabel={submitLabel}
          />
        </form>
      </FormProvider>
    </ChakraProvider>
  );
};

const LockableHarness = ({ onSecondary }: { onSecondary: () => void }) => {
  const [navigationBlocked, setNavigationBlocked] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setNavigationBlocked((blocked) => !blocked)}
      >
        Toggle navigation lock
      </button>
      <Harness
        navigationBlocked={navigationBlocked}
        secondaryAction={{ label: 'Save Draft', onClick: onSecondary }}
      />
    </>
  );
};

describe('TabbedFormWizard', () => {
  it('blocks the next step and exposes the schema error on a real field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Frequencies' }));

    expect(screen.getByLabelText('Mission name')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Launch Site' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('advances with the next button after real input passes validation', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByLabelText('Optional value');
  });

  it('advances with the immediately-next tab after real input passes validation', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('tab', { name: 'Frequencies' }));
    await screen.findByLabelText('Optional value');
  });

  it('allows backward navigation even after the current step becomes invalid', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await user.type(screen.getByLabelText('Optional value'), 'valid');
    await user.click(
      screen.getByRole('button', { name: 'Additional Information' })
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.clear(screen.getByLabelText('Optional value'));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByLabelText('Mission name')).toBeVisible();
  });

  it('allows a validated jump to a previously visited future step', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await user.type(screen.getByLabelText('Optional value'), 'valid');
    await user.click(
      screen.getByRole('button', { name: 'Additional Information' })
    );
    await user.click(screen.getByRole('button', { name: 'Summary' }));
    await screen.findByText('Summary content');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('tab', { name: 'Summary' }));

    await screen.findByText('Summary content');
  });

  it('blocks tabs, back, next, and secondary actions while navigation is locked', async () => {
    const user = userEvent.setup();
    const onSecondary = vi.fn();
    render(<LockableHarness onSecondary={onSecondary} />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await user.click(
      screen.getByRole('button', { name: 'Toggle navigation lock' })
    );

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Additional Information' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    screen.getAllByRole('tab').forEach((tab) => expect(tab).toBeDisabled());
    expect(onSecondary).not.toHaveBeenCalled();
  });

  it('marks and clears a nested error using generic field ownership', async () => {
    const user = userEvent.setup();
    render(<Harness wizardSteps={nestedErrorSteps} />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await user.type(screen.getByLabelText('Optional value'), 'valid');
    await user.click(
      screen.getByRole('button', { name: 'Additional Information' })
    );

    expect(screen.getByLabelText('Item value')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Frequencies' })).toHaveAttribute(
      'aria-invalid',
      'true'
    );

    await user.type(screen.getByLabelText('Item value'), 'valid');
    await user.click(
      screen.getByRole('button', { name: 'Additional Information' })
    );
    await screen.findByText('Additional content');

    expect(screen.getByRole('tab', { name: 'Frequencies' })).toHaveAttribute(
      'aria-invalid',
      'false'
    );
  });

  it('reports active and highest-visited progress', async () => {
    const user = userEvent.setup();
    const onProgressChange = vi.fn();
    render(<Harness onProgressChange={onProgressChange} />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(onProgressChange).toHaveBeenCalledWith({
      activeStep: 1,
      highestVisitedStep: 1,
    });
    expect(onProgressChange).toHaveBeenLastCalledWith({
      activeStep: 0,
      highestVisitedStep: 1,
    });
  });

  it('runs cancel and visible secondary actions and honors secondary action state', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSecondary = vi.fn();
    const { rerender } = render(
      <Harness
        onCancel={onCancel}
        secondaryAction={{ label: 'Save Draft', onClick: onSecondary }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSecondary).toHaveBeenCalledOnce();

    rerender(
      <Harness
        secondaryAction={{
          label: 'Save Draft',
          onClick: onSecondary,
          isVisible: false,
        }}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'Save Draft' })
    ).not.toBeInTheDocument();

    rerender(
      <Harness
        secondaryAction={{
          label: 'Save Draft',
          onClick: onSecondary,
          isDisabled: true,
        }}
      />
    );
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));
    expect(onSecondary).toHaveBeenCalledOnce();
  });

  it('supports custom submit labels, submission, and loading state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const oneStep: readonly FormWizardStep<TestFormValues>[] = [
      {
        id: 'only-step',
        title: 'Only Step',
        content: <LaunchContent />,
      },
    ];
    const { rerender } = render(
      <Harness wizardSteps={oneStep} onSubmit={onSubmit} submitLabel="Finish" />
    );

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual({ mission_name: 'Artemis' });

    rerender(<Harness wizardSteps={oneStep} isSubmitting={true} />);
    expect(
      screen.getByRole('button', { name: 'Submitting...' })
    ).toBeDisabled();
  });
});

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

const SurveyHarness = () => {
  const methods = useForm<SurveyValues>();
  const surveySteps: readonly FormWizardStep<SurveyValues>[] = [
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
            steps={surveySteps}
            isSubmitting={false}
            onCancel={vi.fn()}
          />
        </form>
      </FormProvider>
    </ChakraProvider>
  );
};

describe('schema independence', () => {
  it('runs a differently shaped form with unrelated step IDs and nested fields', async () => {
    const user = userEvent.setup();
    render(<SurveyHarness />);

    await user.type(screen.getByLabelText('Survey name'), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Consent' }));
    await user.type(screen.getByLabelText('Consent'), 'yes');
    await user.click(screen.getByRole('button', { name: 'Complete' }));

    await screen.findByText('Survey complete');
  });
});
