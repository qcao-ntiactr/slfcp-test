import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Divider,
  Flex,
  Heading,
  Text,
  Link,
} from '@chakra-ui/react';
import { GrDocumentPdf } from 'react-icons/gr';

export const HelpPage = () => {
  return (
    <Box p={5}>
      <Heading mb={5}>SLFCP Help Resources</Heading>
      <Divider />
      <Text my={4}>
        Welcome to the SLFCP Help Resources! This guide is designed to help
        commercial and federal users navigate the Space Launch Frequency
        Coordination Portal, submit requests, track inquiries, and communicate
        effectively with NTIA and other agencies.
      </Text>

      <Accordion allowMultiple defaultIndex={[0, 1]}>
        <AccordionItem border="none">
          <AccordionButton fontWeight="bold" fontSize="22px" p={0}>
            Documentation and Resources <AccordionIcon />
          </AccordionButton>
          <AccordionPanel>
            <Flex alignItems="center" gap={1}>
              <GrDocumentPdf />
              <Link
                aria-label="Download the user manual PDF"
                href="/SLFCP_User_Manual.pdf"
                download
                color="blue.600"
                fontWeight="semibold"
                textDecoration="underline"
              >
                Download Help File
              </Link>
            </Flex>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem border="none">
          <AccordionButton fontWeight="bold" fontSize="22px" p={0}>
            Contact and Support
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel>
            <Text>For further assistance, please contact:</Text>
            <Text>
              Email:{' '}
              <Link
                href="mailto:slfcp-support@ntia.gov"
                color="blue.600"
                fontWeight="bold"
                textDecoration="underline"
              >
                slfcp-support@ntia.gov
              </Link>
            </Text>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  );
};
