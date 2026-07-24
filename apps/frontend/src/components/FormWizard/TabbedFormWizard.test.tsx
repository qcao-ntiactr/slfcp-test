/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FormWizardStep } from './TabbedFormWizard.tsx';
import { LockableWizardTestHarness } from './LockableWizardTestHarness.tsx';
import {
  LaunchContent,
  nestedErrorWizardSteps,
  rootErrorWizardSteps,
  TabbedFormWizardTestHarness,
  type TestFormValues,
} from './TabbedFormWizardTestHarness.tsx';

describe('TabbedFormWizard', () => {
  it('blocks the next step and exposes the schema error on a real field', async () => {
    const user = userEvent.setup();
    render(<TabbedFormWizardTestHarness />);

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

  it('blocks the next step and exposes a root-level schema error', async () => {
    const user = userEvent.setup();
    render(<TabbedFormWizardTestHarness wizardSteps={rootErrorWizardSteps} />);

    await user.type(screen.getByLabelText('Mission name'), 'invalid');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The step values are incompatible.'
    );
    expect(screen.getByRole('tab', { name: 'Launch Site' })).toHaveAttribute(
      'aria-invalid',
      'true'
    );

    await user.clear(screen.getByLabelText('Mission name'));
    await user.type(screen.getByLabelText('Mission name'), 'valid');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByLabelText('Optional value');
  });

  it('advances with the next button after real input passes validation', async () => {
    const user = userEvent.setup();
    render(<TabbedFormWizardTestHarness />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Frequencies' }));
    await screen.findByLabelText('Optional value');
  });

  it('advances with the immediately-next tab after real input passes validation', async () => {
    const user = userEvent.setup();
    render(<TabbedFormWizardTestHarness />);

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('tab', { name: 'Frequencies' }));
    await screen.findByLabelText('Optional value');
  });

  it('allows backward navigation even after the current step becomes invalid', async () => {
    const user = userEvent.setup();
    render(<TabbedFormWizardTestHarness />);

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
    render(<TabbedFormWizardTestHarness />);

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
    render(<LockableWizardTestHarness onSecondary={onSecondary} />);

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
    render(
      <TabbedFormWizardTestHarness wizardSteps={nestedErrorWizardSteps} />
    );

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
    render(<TabbedFormWizardTestHarness onProgressChange={onProgressChange} />);

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
      <TabbedFormWizardTestHarness
        onCancel={onCancel}
        secondaryAction={{ label: 'Save Draft', onClick: onSecondary }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSecondary).toHaveBeenCalledOnce();

    rerender(
      <TabbedFormWizardTestHarness
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
      <TabbedFormWizardTestHarness
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
      <TabbedFormWizardTestHarness
        wizardSteps={oneStep}
        onSubmit={onSubmit}
        submitLabel="Finish"
      />
    );

    await user.type(screen.getByLabelText('Mission name'), 'Artemis');
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual({ mission_name: 'Artemis' });

    rerender(
      <TabbedFormWizardTestHarness wizardSteps={oneStep} isSubmitting={true} />
    );
    expect(
      screen.getByRole('button', { name: 'Submitting...' })
    ).toBeDisabled();
  });
});
