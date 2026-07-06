import React from 'react';
import { Box, Image, Text, VStack, Container } from '@chakra-ui/react';

import Logo from '../assets/slfcp-logo.png';

export const MaintenancePage: React.FC = () => {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Container maxW="container.xl" centerContent>
        <VStack spacing={8} textAlign="center">
          <Image src={Logo} alt="SLFCP Logo" width="500px" />
          <VStack spacing={4} width="892px">
            <Text fontSize="40px" fontWeight="bold">
              We’re currently down for maintenance
            </Text>
            <Text fontSize="24px" maxW="709px">
              Our site is currently undergoing scheduled maintenance to improve
              your experience. We’ll be back later.
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default MaintenancePage;
