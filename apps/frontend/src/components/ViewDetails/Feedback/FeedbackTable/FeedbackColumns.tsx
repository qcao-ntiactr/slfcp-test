import { Text } from '@chakra-ui/react';
import { format } from 'date-fns';

import { ExpandableContentCell } from '../../../ExpandableContentCell';

import { FrontendFeedback } from './FeedbackTable';

const ExpandableFeedbackCell = ({
  feedback,
}: {
  feedback: FrontendFeedback;
}) => {
  const content =
    feedback.type === 'action' ? feedback.details : feedback.comment;
  const isInternal = feedback.type === 'comment' && feedback.is_internal;
  const isMarkdownAction = feedback.type === 'action';

  const getAgencyDisplay = () => {
    const userName = feedback.user_name;
    if (feedback.federal_agency_abbr)
      return `${feedback.federal_agency_abbr} (${userName})`;
    if (feedback.user_type === 'NTIA') return `NTIA (${userName})`;
    if (feedback.user_type === 'COMMERCIAL') return `Commercial (${userName})`;
    return userName;
  };

  const formattedCreatedAt = feedback.createdAt
    ? format(new Date(feedback.createdAt), 'MMM d, yyyy | h:mm a')
    : 'N/A';
  const metadataLabel = `${getAgencyDisplay()}${isInternal ? ' [INTERNAL]' : ''}`;

  return (
    <ExpandableContentCell
      content={content}
      renderMode={isMarkdownAction ? 'markdown' : 'text'}
      ariaLabel="Expand feedback details"
      metadataLabel={metadataLabel}
      metadataDate={formattedCreatedAt}
    />
  );
};

export const getFeedbackColumns = () => {
  return [
    {
      header: 'Date and Time',
      key: 'dateAndTime',
      render: (feedback: FrontendFeedback) => {
        const content = feedback.createdAt
          ? format(new Date(feedback.createdAt), 'MM-dd-yyyy hh:mm a')
          : '';
        return (
          <Text tabIndex={0} fontSize="16px">
            {content}
          </Text>
        );
      },
    },
    {
      header: 'Type',
      key: 'type',
      render: (feedback: FrontendFeedback) => {
        let typeText = '';
        if (feedback.type === 'comment') typeText = 'Comment';
        else if (feedback.type === 'action') {
          typeText = feedback.action
            .split('_')
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(' ');
        }
        return (
          <Text tabIndex={0} fontSize="16px">
            {typeText}
          </Text>
        );
      },
    },
    {
      header: 'Agency (name)',
      key: 'agency',
      render: (feedback: FrontendFeedback) => {
        const userName = feedback.user_name;
        let agencyText = '';
        if (feedback.federal_agency_abbr)
          agencyText = `${feedback.federal_agency_abbr} (${userName})`;
        else if (feedback.user_type === 'NTIA')
          agencyText = `NTIA (${userName})`;
        else if (feedback.user_type === 'COMMERCIAL')
          agencyText = `Commercial (${userName})`;
        else agencyText = userName;

        return (
          <Text tabIndex={0} fontSize="16px">
            {agencyText}
          </Text>
        );
      },
    },
    {
      header: 'Details',
      key: 'details',
      render: (feedback: FrontendFeedback) => {
        return <ExpandableFeedbackCell feedback={feedback} />;
      },
    },
  ];
};
