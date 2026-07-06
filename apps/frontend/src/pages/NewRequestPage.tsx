import { Box } from '@chakra-ui/react';

import { NewRequestForm } from '../components/RequestForm/NewRequestForm';

export const NewRequestPage = () => {
  return (
    <Box margin="25px auto" maxWidth="970px">
      <NewRequestForm />
    </Box>
  );
};
