import {
  renderCommonConditionsHtml,
  renderCommonConditionsText,
} from '@slfcp/normalize-markdown';

export const formatEmailMarkdown = (markdown?: string | null) =>
  renderCommonConditionsText(markdown);

export const formatEmailMarkdownHtml = (markdown?: string | null) =>
  renderCommonConditionsHtml(markdown, { variant: 'email' });
