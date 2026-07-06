import { Flex, Icon, Link } from '@chakra-ui/react';
import { GrDocumentPdf } from 'react-icons/gr';

interface PdfDownloadLinkProps {
  href: string;
  label: string;
  ariaLabel: string;
}

export const PdfDownloadLink = ({
  href,
  label,
  ariaLabel,
}: PdfDownloadLinkProps) => {
  return (
    <Flex align="center" gap={2}>
      <Icon as={GrDocumentPdf} color="blue.600" />
      <Link
        aria-label={ariaLabel}
        color="blue.600"
        download
        fontWeight="semibold"
        href={href}
        textDecoration="underline"
      >
        {label}
      </Link>
    </Flex>
  );
};
