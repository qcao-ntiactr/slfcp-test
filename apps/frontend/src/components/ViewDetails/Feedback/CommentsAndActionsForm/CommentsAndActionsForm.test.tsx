/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../../context/HybridAuthContext';

import { CommentsAndActionsForm } from './CommentsAndActionsForm';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../../api/Concurrences', () => ({
  getConcurrencesByRequestId: vi.fn(),
}));

vi.mock(
  '../FeedbackTable/CommonConditions/CommonConditionsDropDown.tsx',
  () => ({
    CommonConditionsDropDown: () => <div>Common Conditions</div>,
  })
);

vi.mock('../FeedbackTable/CommonConditions/CommonConditionsEditor.tsx', () => ({
  CommonConditionsEditor: React.forwardRef((_props, _ref) => (
    <div>Common Conditions Editor</div>
  )),
}));

const user = {
  id: 'user-1',
  tenantId: 'tenant-1',
  displayName: 'Test User',
  email: 'test@example.com',
  role: UserRole.ntia,
  federalAgencyId: 1,
  userPrincipalName: 'test@example.com',
};

const actionOptions = [
  { value: 'finalize_denial', label: 'Final Denial' },
  { value: 'request_revisions', label: 'Request Revisions' },
  { value: 'approve_with_conditions', label: 'Approve With Conditions' },
];

const renderForm = () =>
  render(
    <ChakraProvider>
      <CommentsAndActionsForm
        user={user}
        status="UNDER_NTIA_INITIAL_REVIEW"
        requestId={123}
        actionOptions={actionOptions}
      />
    </ChakraProvider>
  );

describe('CommentsAndActionsForm', () => {
  it('renders a plain textarea labeled Reason for final denial', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Request Action'), {
      target: { value: 'finalize_denial' },
    });

    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
    expect(
      screen.queryByText('Common Conditions Editor')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Common Conditions')).not.toBeInTheDocument();
  });

  it('renders a plain textarea labeled Requested Changes for request revisions', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Request Action'), {
      target: { value: 'request_revisions' },
    });

    expect(screen.getByLabelText('Requested Changes')).toBeInTheDocument();
    expect(
      screen.queryByText('Common Conditions Editor')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Common Conditions')).not.toBeInTheDocument();
  });

  it('renders the common conditions controls for approve with conditions', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Request Action'), {
      target: { value: 'approve_with_conditions' },
    });

    expect(screen.getByText('Common Conditions')).toBeInTheDocument();
    expect(screen.getByText('Common Conditions Editor')).toBeInTheDocument();
    expect(screen.queryByLabelText('Conditions')).not.toBeInTheDocument();
  });
});
