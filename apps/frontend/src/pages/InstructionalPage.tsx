import { Box, Button, Heading, Image, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

import Logo from '../assets/slfcp-logo.png';
import { InstructionStep } from '../components/InstructionalPage/InstructionStep';
import { PdfDownloadLink } from '../components/PdfDownloadLink';

export const InstructionalPage = () => {
  return (
    <Box py={{ base: 8, md: 10 }} px={{ base: 6, md: 8 }}>
      <VStack
        align="stretch"
        gap={8}
        margin="0 auto"
        maxWidth="1200px"
        width="100%"
      >
        <Box width="100%">
          <Button
            as={RouterLink}
            to="/login"
            aria-label="Back to login"
            display="inline-flex"
            height="auto"
            mb={6}
            minW="unset"
            p={0}
            variant="unstyled"
          >
            <Image
              alt="SLFCP logo"
              src={Logo}
              width={{ base: '140px', md: '200px' }}
            />
          </Button>
          <Heading mb={3}>New User Access Instructions</Heading>
          <Text>
            Before signing in for the first time, complete the required setup
            steps below. Start by submitting the SAAR form to request access.
          </Text>
        </Box>

        <VStack align="stretch" gap={6} width="100%">
          <InstructionStep
            description="Download, complete, and submit the SAAR form to request access. Once your submission is approved, you'll get a confirmation email and then you can complete step 2."
            stepNumber="1"
            title="Complete the SAAR Form"
          >
            <PdfDownloadLink
              href="/SpaceLaunchSAAR.pdf"
              label="SAAR Form"
              ariaLabel="Download SAAR Form as PDF"
            />
          </InstructionStep>

          <InstructionStep
            description="Follow the guide for step-by-step instructions on creating your login.gov account and signing in."
            stepNumber="2"
            title="Download Setup Guide"
          >
            <PdfDownloadLink
              href="/SLFCP_SignUp_Instructions.pdf"
              label="Setup guide"
              ariaLabel="Download Setup Guide as PDF"
            />
          </InstructionStep>
        </VStack>
      </VStack>
    </Box>
  );
};
