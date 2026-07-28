/**
 * @vitest-environment jsdom
 */
import { ChakraProvider } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FrequencyFormDefaults,
  PortalFormDefaults,
  frequencyFormSchema,
} from '@slfcp/validation';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, describe, expect, it } from 'vitest';

import { frequencyFormDefaultValues } from '../../utils/DefaultValues';

import { FrequenciesTab } from './FrequenciesTab';

afterEach(cleanup);

const Harness = ({
  numberOfFrequencies = 1,
}: {
  numberOfFrequencies?: number;
}) => {
  const requestMethods = useForm<PortalFormDefaults>({
    defaultValues: {
      number_of_frequencies: numberOfFrequencies,
      frequencies: [],
    },
  });
  const frequencyFormMethods = useForm<FrequencyFormDefaults>({
    resolver: zodResolver(frequencyFormSchema),
    defaultValues: frequencyFormDefaultValues,
    mode: 'onChange',
  });
  const [showStep, setShowStep] = useState(true);
  const [, setEditorIsVisible] = useState(false);
  const [isEditingFrequency, setIsEditingFrequency] = useState(false);

  return (
    <ChakraProvider>
      <button type="button" onClick={() => setShowStep((visible) => !visible)}>
        Toggle step
      </button>
      <FormProvider {...requestMethods}>
        {showStep && (
          <FrequenciesTab
            frequencyFormMethods={frequencyFormMethods}
            isEditingFrequency={isEditingFrequency}
            onEditorVisibilityChange={setEditorIsVisible}
            setIsEditingFrequency={setIsEditingFrequency}
          />
        )}
      </FormProvider>
    </ChakraProvider>
  );
};

describe('FrequenciesTab editor persistence', () => {
  it('revalidates the frequency value on every change', async () => {
    render(<Harness />);

    const frequencyInput = await screen.findByLabelText('Frequency Value');
    fireEvent.change(frequencyInput, { target: { value: '500' } });

    expect(
      await screen.findByText(/Frequency must be within the following ranges/)
    ).toBeVisible();

    fireEvent.change(frequencyInput, { target: { value: '2050' } });

    await waitFor(() =>
      expect(
        screen.queryByText(/Frequency must be within the following ranges/)
      ).not.toBeInTheDocument()
    );
  });

  it('shows bandwidth justification in a newly opened frequency editor', async () => {
    render(<Harness numberOfFrequencies={0} />);

    fireEvent.change(screen.getByLabelText('Number Of Frequencies'), {
      target: { value: '1' },
    });

    const transmittedBandwidth = await screen.findByLabelText(
      'Transmitted Bandwidth'
    );
    fireEvent.change(transmittedBandwidth, { target: { value: '6' } });
    fireEvent.blur(transmittedBandwidth);
    fireEvent.click(screen.getByText('Signal is Filtered'));

    expect(
      await screen.findByLabelText('Bandwidth Justification')
    ).toBeVisible();
  });

  it('retains an unfinished frequency when the wizard step is remounted', async () => {
    render(<Harness />);

    const frequencyInput = await screen.findByLabelText('Frequency Value');
    fireEvent.change(frequencyInput, { target: { value: '2050' } });
    fireEvent.click(screen.getByRole('button', { name: 'Toggle step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle step' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Frequency Value')).toHaveValue(2050)
    );
  });

  it('retains frequency validation errors when the wizard step is remounted', async () => {
    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByLabelText('Frequency Value')).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle step' }));

    expect(screen.getByLabelText('Frequency Value')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });
});
