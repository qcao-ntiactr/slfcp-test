/**
 * @vitest-environment jsdom
 */
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Wizard } from 'react-use-wizard';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@slfcp/validation', () => {
  const optionalStep = z.object({ optional: z.string().optional() });
  return {
    requestWizardSteps: () => ({
      launchSite: {
        fields: ['mission_name'],
        schema: z.object({ mission_name: z.string().min(1, 'Required') }),
      },
      frequencies: { fields: ['optional'], schema: optionalStep },
      additionalInformation: { fields: ['optional'], schema: optionalStep },
    }),
  };
});

import { RequestWizardLayout } from './RequestWizardLayout';

afterEach(cleanup);

const Harness = ({
  defaultValues,
  highestVisitedStep = 0,
}: {
  defaultValues?: { mission_name?: string };
  highestVisitedStep?: number;
}) => {
  const methods = useForm({ defaultValues });

  return (
    <ChakraProvider>
      <FormProvider {...methods}>
        <Wizard
          wrapper={
            <RequestWizardLayout
              headerText="Request"
              highestVisitedStep={highestVisitedStep}
              isEditingFrequency={false}
              isSubmitting={false}
              onCancel={vi.fn()}
              onRequestSaveDraft={vi.fn()}
              showSaveDraft={false}
            />
          }
        >
          <Step>Launch content</Step>
          <Step>Frequency content</Step>
          <Step>Additional content</Step>
          <Step>Summary content</Step>
        </Wizard>
      </FormProvider>
    </ChakraProvider>
  );
};

const Step = ({ children }: PropsWithChildren) => <div>{children}</div>;

describe('RequestWizardLayout', () => {
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

    await waitFor(() =>
      expect(screen.getByText('Frequency content')).toBeInTheDocument()
    );
  });

  it('validates and advances when the immediately-next tab is clicked', async () => {
    render(<Harness defaultValues={{ mission_name: 'Artemis' }} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Frequencies' }));

    await waitFor(() =>
      expect(screen.getByText('Frequency content')).toBeInTheDocument()
    );
  });

  it('allows backward navigation without revalidating the current step', async () => {
    render(<Harness defaultValues={{ mission_name: 'Artemis' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByText('Frequency content');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(screen.getByText('Launch content')).toBeInTheDocument()
    );
  });

  it('allows a validated jump to a previously visited future step', async () => {
    render(
      <Harness
        defaultValues={{ mission_name: 'Artemis' }}
        highestVisitedStep={3}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Summary' }));

    await waitFor(() =>
      expect(screen.getByText('Summary content')).toBeInTheDocument()
    );
  });
});
