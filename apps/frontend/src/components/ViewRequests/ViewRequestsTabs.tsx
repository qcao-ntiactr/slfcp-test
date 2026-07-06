import { TabList, TabPanel, TabPanels, Tabs, Box } from '@chakra-ui/react';

import { TabHeader } from '../RequestForm/TabContents';
import { useHybridAuth, UserRole } from '../../context/HybridAuthContext';

import RequestsTable from './RequestsTab/RequestsTable';
import { RequestDraftsTable } from './RequestDraftsTab/RequestDraftsTable';

export const ViewRequestsTabs = () => {
  const { user } = useHybridAuth();
  const userRole = user?.role;

  if (userRole === UserRole.federal || userRole === UserRole.ntia) {
    return (
      <Box px={5}>
        <RequestsTable />
      </Box>
    );
  }

  return (
    <Tabs px={5}>
      <TabList>
        <TabHeader
          tabName="Requests"
          flexGrow={1}
          justifyContent="flex-start"
        />
        <TabHeader tabName="Drafts" flexGrow={1} justifyContent="flex-start" />
      </TabList>
      <TabPanels>
        <TabPanel>
          <RequestsTable />
        </TabPanel>
        <TabPanel>
          <RequestDraftsTable />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};
