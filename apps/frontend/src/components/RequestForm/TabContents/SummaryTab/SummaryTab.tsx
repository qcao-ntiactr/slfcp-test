import { Box } from '@chakra-ui/react';

import { LaunchSiteTab } from '../LaunchSiteTab';
import { AdditionalInformationTab } from '../AdditionalInformationTab';

import { FrequenciesSummary } from './FrequenciesSummary';

export const SummaryTab = () => {
  return (
    <Box className={'tab-container'}>
      <LaunchSiteTab isReadOnly={true} isTabContainer={false} />
      <FrequenciesSummary />
      <AdditionalInformationTab isReadOnly={true} isTabContainer={false} />
    </Box>
  );
};
