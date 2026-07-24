import { useState } from 'react';

import { TabbedFormWizardTestHarness } from './TabbedFormWizardTestHarness.tsx';

export interface LockableWizardTestHarnessProps {
  onSecondary: () => void;
}

export const LockableWizardTestHarness = ({
  onSecondary,
}: LockableWizardTestHarnessProps) => {
  const [navigationBlocked, setNavigationBlocked] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setNavigationBlocked((blocked) => !blocked)}
      >
        Toggle navigation lock
      </button>
      <TabbedFormWizardTestHarness
        navigationBlocked={navigationBlocked}
        secondaryAction={{ label: 'Save Draft', onClick: onSecondary }}
      />
    </>
  );
};
