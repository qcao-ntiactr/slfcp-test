import { Box, Flex, Heading, Text } from '@chakra-ui/react';

import { useHybridAuth, UserRole } from '../context/HybridAuthContext';

export const LandingPage = () => {
  const { user } = useHybridAuth();

  return (
    <Flex flexDir="column" px={16} pt={6} gap={12} minH="100dvh" pb={8}>
      <Flex flexDir="column" gap={5}>
        <Heading size="lg">
          Welcome to the Space Launch Frequency Coordination Portal
        </Heading>
        <Text>Simplifying Space Launch Planning and Communication</Text>
        <Text>
          Whether you're submitting a new request, revising an existing one, or
          tracking approvals, this portal gives you the tools to coordinate
          launch frequencies with clarity and confidence. Designed for the
          fast-paced needs of mission planners, satellite operators, and launch
          providers, it's more than a platform--it's your partner in navigating
          the complexities of space operations.
        </Text>
        <Text>Start managing your missions today.</Text>
      </Flex>

      <Box flex="1" />

      {user?.role === UserRole.commercial && (
        <Text
          backgroundColor="#FEC513"
          fontWeight="bold"
          textAlign="left"
          borderRadius="10px"
          fontSize="14px"
          p={6}
        >
          Advisory: NTIA/FCC caution that a failure to submit a frequency
          coordination request to the space launch frequency coordinator 60 days
          or more from the anticipated launch date or start of a primary launch
          window may leave insufficient time for the coordinator to fully engage
          all relevant incumbent coordinators, whether federal or non-federal,
          and receive critical input necessary to process the request prior to
          the requested launch date. (Ref. DA 25-270)
        </Text>
      )}
    </Flex>
  );
};
