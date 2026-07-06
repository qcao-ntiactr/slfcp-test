import { Box } from '@chakra-ui/react';
import { renderCommonConditionsHtml } from '@slfcp/normalize-markdown';

import { compactCommonConditionsProseStyles } from './proseStyles';

type ReadOnlyTipTapMarkdownProps = {
  markdown: string;
};

export const ReadOnlyTipTapMarkdown = ({
  markdown,
}: ReadOnlyTipTapMarkdownProps) => {
  const html = renderCommonConditionsHtml(markdown, { variant: 'readonly' });

  return (
    <Box
      sx={{
        ...compactCommonConditionsProseStyles,
        fontSize: '16px',
        lineHeight: '24px',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
