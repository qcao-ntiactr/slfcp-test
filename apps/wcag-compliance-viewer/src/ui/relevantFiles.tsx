import { Box, Text } from '@chakra-ui/react';

import { FileTree } from './FileTree';
import { formatText } from './textFormat';

export function formatRelevantFiles(value: string) {
  if (value === 'Not applicable.') {
    return <Text color="gray.700">Not applicable.</Text>;
  }

  const paths = [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  if (paths.length === 0) {
    return <Box color="gray.700">{formatText(value)}</Box>;
  }

  return <FileTree paths={paths} />;
}
