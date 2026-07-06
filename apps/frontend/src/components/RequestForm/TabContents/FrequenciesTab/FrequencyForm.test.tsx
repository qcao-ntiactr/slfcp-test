/**
 * @vitest-environment jsdom
 */
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrequencyFormDefaults } from '@slfcp/validation';

import { frequencyFormDefaultValues } from '../../utils/DefaultValues';

import { FrequencyForm } from './FrequencyForm';

afterEach(() => {
  cleanup();
});

const renderFrequencyForm = (
  onSubmit: (_data: FieldValues) => void,
  initialValues: FrequencyFormDefaults = frequencyFormDefaultValues
) => {
  const Wrapper = () => {
    const methods = useForm<FrequencyFormDefaults>({
      defaultValues: initialValues,
      mode: 'onChange',
    });

    return (
      <ChakraProvider>
        <FormProvider {...methods}>
          <FrequencyForm
            onSubmit={onSubmit}
            onCancel={vi.fn()}
            initialValues={initialValues}
            isEditingFrequency={false}
          />
        </FormProvider>
      </ChakraProvider>
    );
  };

  return render(<Wrapper />);
};

describe('FrequencyForm receiver 2 synchronization', () => {
  it('submits without receiver 2 after the section is collapsed and removed', async () => {
    const handleSubmit = vi.fn();
    renderFrequencyForm(handleSubmit);

    fireEvent.click(screen.getByLabelText('Show second receiver section'));

    const antennaTypeInputs = screen.getAllByLabelText('Antenna Type');
    fireEvent.change(antennaTypeInputs[2], {
      target: { value: 'Transient receiver' },
    });

    fireEvent.click(screen.getByLabelText('Hide second receiver section'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove receiver' }));
    fireEvent.click(screen.getByLabelText('Add frequency'));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const submittedValue = handleSubmit.mock
      .calls[0][0] as FrequencyFormDefaults;
    expect(submittedValue.receivers).toHaveLength(1);
    expect(submittedValue.receivers?.[0]).toBeDefined();
  });

  it('keeps receiver 2 visible and invalid when collapse removal is cancelled', async () => {
    const handleSubmit = vi.fn();
    renderFrequencyForm(handleSubmit);

    fireEvent.click(screen.getByLabelText('Show second receiver section'));

    const antennaTypeInputs = screen.getAllByLabelText('Antenna Type');
    fireEvent.change(antennaTypeInputs[2], {
      target: { value: 'Transient receiver' },
    });

    fireEvent.click(screen.getByLabelText('Hide second receiver section'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.getByLabelText('Hide second receiver section')
    ).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
