import { Box, Flex, Heading, Text, Button } from '@chakra-ui/react';

import { useHybridAuth } from '../context/HybridAuthContext';

export const InactiveUserPage = () => {
  const { logout, authError } = useHybridAuth();

  const isInactiveUser = authError?.includes('inactive');

  return (
    <Flex
      flexDir="column"
      alignItems="center"
      justifyContent="center"
      minH="100dvh"
      px={4}
    >
      <Box textAlign="center" maxW="500px">
        <Heading size="2xl" mb={4} color="red.600">
          {isInactiveUser ? 'Account Inactive' : 'Access Denied'}
        </Heading>
        <Text fontSize="lg" mb={6} color="gray.700">
          {isInactiveUser
            ? 'User is not active/not authorized to use the system. Please contact NTIA helpdesk.'
            : 'Your account does not exist in our system or you do not have access. Please contact NTIA helpdesk.'}
        </Text>
        <Text fontSize="md" mb={8} color="gray.600">
          {authError}
        </Text>
        <Button colorScheme="blue" onClick={() => logout()}>
          Log Out
        </Button>
      </Box>
    </Flex>
  );
};
