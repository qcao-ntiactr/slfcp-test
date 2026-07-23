/**
 * @vitest-environment jsdom
 */
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { FormWizardStep, TabbedFormWizard } from './TabbedFormWizard.tsx';

interface TestFormValues {
  mission_name?: string;
  optional?: string;
  frequencies?: { value?: string }[];
}

const optionalStepSchema = z.object({ optional: z.string().optional() });

const FrequencyContent = () => {
  const { setError, setValue } = useFormContext<TestFormValues>();

  return (
    <div>
      Frequency content
      <button
        type="button"
        onClick={() =>
          setError('frequencies.0.value', { message: 'Invalid frequency' })
        }
      >
        Add frequency error
      </button>
      <button type="button" onClick={() => setValue('optional', 'valid')}>
        Fix schema error
      </button>
    </div>
  );
};

const steps: readonly FormWizardStep<TestFormValues>[] = [
  {
    id: 'launch',
    title: 'Launch Site',
    content: <div>Launch content</div>,
    validation: {
      fields: ['mission_name'],
      schema: z.object({
        mission_name: z.string().min(1, 'Required'),
      }),
    },
  },
  {
    id: 'frequencies',
    title: 'Frequencies',
    content: <FrequencyContent />,
    validation: {
      fields: ['optional'],
      schema: optionalStepSchema,
    },
  },
  {
    id: 'additional',
    title: 'Additional Information',
    content: <div>Additional content</div>,
    validation: {
      fields: ['optional'],
      schema: optionalStepSchema,
    },
  },
  {
    id: 'summary',
    title: 'Summary',
    content: <div>Summary content</div>,
  },
];

const schemaErrorSteps: readonly FormWizardStep<TestFormValues>[] = [
  steps[0],
  {
    ...steps[1],
    validation: {
      fields: ['optional'],
      schema: optionalStepSchema.superRefine((values, context) => {
        if (values.optional !== 'valid') {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid frequency',
            path: ['frequencies', 0, 'value'],
          });
        }
      }),
    },
  },
  steps[2],
];

const Harness = ({
  defaultValues,
  navigationBlocked = false,
  wizardSteps = steps,
}: {
  defaultValues?: TestFormValues;
  navigationBlocked?: boolean;
  wizardSteps?: readonly FormWizardStep<TestFormValues>[];
}) => {
  const methods = useForm<TestFormValues>({ defaultValues });

  return (
    <ChakraProvider>
      <FormProvider {...methods}>
        <form>
          <TabbedFormWizard
            headerText="Request"
            steps={wizardSteps}
            isSubmitting={false}
            navigationBlocked={navigationBlocked}
            onCancel={vi.fn()}
          />
        </form>
      </FormProvider>
    </ChakraProvider>
  );
};

describe('TabbedFormWizard', () => {
  it('blocks the next step when the active step schema fails', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Frequencies' }));

    await waitFor(() =>
      expect(screen.getByText('Launch content')).toBeInTheDocument()
    );
  });

  it('advances when the active step schema passes', async () => {
    render(<Harness defaultValues={{ mission_name: 'Artemis' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Frequencies' }));

    await screen.findByText('Frequency content');
  });

  it('validates and advances when the immediately-next tab is clicked', async () => {
    render(<Harness defaultValues={{ mission_name: 'Artemis' }} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Frequencies' }));

    await screen.findByText('Frequency content');
  });

  it('allows backward navigation without revalidating the current step', async () => {
    render(<Harness defaultValues={{ mission_name: 'Artemis' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByText('Frequency content');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    await screen.findByText('Launch content');
  });

  it('allows a validated jump to a previously visited future step', async () => {
    render(<Harness defaultValues={{ mission_name: 'Artemis' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByText('Frequency content');
    fireEvent.click(
      screen.getByRole('button', { name: 'Additional Information' })
    );
    await screen.findByText('Additional content');
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    await screen.findByText('Summary content');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByText('Additional content');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByText('Frequency content');
    fireEvent.click(screen.getByRole('tab', { name: 'Summary' }));

    await screen.findByText('Summary content');
  });

  it('blocks all wizard navigation while a step has an active edit', () => {
    render(
      <Harness
        defaultValues={{ mission_name: 'Artemis' }}
        navigationBlocked={true}
      />
    );

    expect(screen.getByRole('button', { name: 'Frequencies' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('marks the frequencies tab invalid for a nested frequency error', async () => {
    render(<Harness defaultValues={{ mission_name: 'Artemis' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByText('Frequency content');
    fireEvent.click(
      screen.getByRole('button', { name: 'Add frequency error' })
    );

    expect(
      screen.getByRole('tab', { name: 'Frequencies' }).querySelector('p')
    ).not.toBeNull();
  });

  it('clears schema error paths before a successful revalidation', async () => {
    render(
      <Harness
        defaultValues={{ mission_name: 'Artemis' }}
        wizardSteps={schemaErrorSteps}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByText('Frequency content');
    fireEvent.click(
      screen.getByRole('button', { name: 'Additional Information' })
    );

    await waitFor(() =>
      expect(
        screen.getByRole('tab', { name: 'Frequencies' }).querySelector('p')
      ).not.toBeNull()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fix schema error' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Additional Information' })
    );
    await screen.findByText('Additional content');

    expect(
      screen.getByRole('tab', { name: 'Frequencies' }).querySelector('p')
    ).toBeNull();
  });
});
