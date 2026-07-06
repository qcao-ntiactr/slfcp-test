import {
  Box,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import { useState } from 'react';
import { RequestDetails } from 'apps/frontend/src/types';

import {
  LicenseeAndLaunchTab,
  EcfCartesianVectorsFormatTab,
  PocTab,
} from '../../../components/ViewDetails/Tabs';

import { FrequenciesTab } from './FrequenciesTab/FrequenciesTab';

interface ViewDetailsTabsProps {
  request: RequestDetails;
}

export const ViewDetailsTabs = ({ request }: ViewDetailsTabsProps) => {
  const [tabIndex, setTabIndex] = useState(0);

  const tabs = [
    {
      label: 'Licensee and Launch',
      content: (
        <LicenseeAndLaunchTab
          mission_name={request.mission_name}
          name_of_licensee={request.name_of_licensee}
          call_sign={request.call_sign}
          name_of_launch_vehicle={request.name_of_launch_vehicle}
          city={request.city}
          state={request.state}
          latitude={request.latitude}
          longitude={request.longitude}
          launch_datetime_primary={request.launch_datetime_primary}
          launch_datetime_backup={request.launch_datetime_backup}
          orbital_location={request.orbital_location}
        />
      ),
    },
    {
      label: 'Frequencies',
      content: <FrequenciesTab frequencies={request.frequencies} />,
    },
    {
      label: 'ECF Cartesian Vectors Format',
      content: (
        <EcfCartesianVectorsFormatTab
          ecf_cartesian_vectors_format_file={
            request.ecf_cartesian_vectors_format_file
          }
          ecf_cartesian_vectors_format_file_desc={
            request.ecf_cartesian_vectors_format_file_desc
          }
          ground_track_of_launch_vehicle_2d_img_file={
            request.ground_track_of_launch_vehicle_2d_img_file
          }
          ground_track_of_launch_vehicle_2d_img_file_desc={
            request.ground_track_of_launch_vehicle_2d_img_file_desc
          }
          ground_track_from_liftoff_until_payload_separation={
            request.ground_track_from_liftoff_until_payload_separation
          }
        />
      ),
    },
    {
      label: 'POC',
      content: (
        <PocTab
          primary_poc_name={request.primary_poc_name}
          primary_poc_email={request.primary_poc_email}
          primary_poc_phone={request.primary_poc_phone}
          alternate_poc_name={request.alternate_poc_name}
          alternate_poc_email={request.alternate_poc_email}
          alternate_poc_phone={request.alternate_poc_phone}
        />
      ),
    },
  ];

  return (
    <Box backgroundColor="#F5F7FA" p={8} mb={5}>
      <Heading size="md" mb={9}>
        Request Information
      </Heading>
      <Tabs
        index={tabIndex}
        onChange={setTabIndex}
        isFitted
        maxW="1600px"
        m="0 auto"
        w="100%"
      >
        <TabList justifyContent="space-evenly">
          {tabs.map((tab, idx) => (
            <Tab key={idx} fontWeight="bold">
              {tab.label}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabs.map((tab, idx) => (
            <TabPanel key={idx}>{tab.content}</TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );
};
