import type {
  JSONContent,
  MarkdownLexerConfiguration,
  MarkdownParseHelpers,
  MarkdownToken,
} from '@tiptap/core';

export type OrderedListStyle = 'decimal' | 'lower-alpha' | 'upper-alpha';

type OrderedMarkerInfo = {
  marker: string;
  start: number;
  style: OrderedListStyle;
};

type ExtendedMarkdownToken = MarkdownToken & {
  items?: ExtendedMarkdownToken[];
  ordered?: boolean;
  start?: number;
  listStyle?: OrderedListStyle;
  tokens?: ExtendedMarkdownToken[];
  raw?: string;
};

type OrderedListItem = {
  content: string;
  indent: number;
  raw: string;
  start: number;
  style: OrderedListStyle;
};

const ORDERED_LIST_ITEM_REGEX = /^(\s*)(\d+|[a-z]+|[A-Z]+)\.\s+(.*)$/;
const INDENTED_LINE_REGEX = /^\s/;

export const getOrderedListStyleLabel = (style: OrderedListStyle) => {
  switch (style) {
    case 'lower-alpha':
      return 'Lowercase alphabet';
    case 'upper-alpha':
      return 'Uppercase alphabet';
    case 'decimal':
    default:
      return 'Numbered';
  }
};

export const getOrderedListMarkerPreview = (style: OrderedListStyle) => {
  switch (style) {
    case 'lower-alpha':
      return 'a.';
    case 'upper-alpha':
      return 'A.';
    case 'decimal':
    default:
      return '1.';
  }
};

export const getMarkerForIndex = (
  style: OrderedListStyle,
  start: number,
  index: number
) => {
  const value = start + index;

  if (style === 'decimal') {
    return `${value}.`;
  }

  return `${numberToAlpha(value, style === 'upper-alpha')}.`;
};

export const parseOrderedListItems = (
  lines: string[]
): [OrderedListItem[], number] => {
  const listItems: OrderedListItem[] = [];
  let currentLineIndex = 0;
  let consumed = 0;
  let rootStyle: OrderedListStyle | null = null;

  while (currentLineIndex < lines.length) {
    const line = lines[currentLineIndex];
    const match = line.match(ORDERED_LIST_ITEM_REGEX);

    if (!match) {
      break;
    }

    const [, indent, marker, content] = match;
    const markerInfo = parseOrderedMarker(marker);

    if (!markerInfo) {
      break;
    }

    if (indent.length === 0) {
      if (rootStyle === null) {
        rootStyle = markerInfo.style;
      } else if (rootStyle !== markerInfo.style) {
        break;
      }
    }

    const indentLevel = indent.length;
    let itemContent = content;
    let nextLineIndex = currentLineIndex + 1;
    const itemLines = [line];

    while (nextLineIndex < lines.length) {
      const nextLine = lines[nextLineIndex];
      const nextMatch = nextLine.match(ORDERED_LIST_ITEM_REGEX);

      if (nextMatch) {
        break;
      }

      if (nextLine.trim() === '') {
        itemLines.push(nextLine);
        itemContent += '\n';
        nextLineIndex += 1;
      } else if (nextLine.match(INDENTED_LINE_REGEX)) {
        itemLines.push(nextLine);
        itemContent += `\n${nextLine.slice(indentLevel + 2)}`;
        nextLineIndex += 1;
      } else {
        break;
      }
    }

    listItems.push({
      content: itemContent.trim(),
      indent: indentLevel,
      raw: itemLines.join('\n'),
      start: markerInfo.start,
      style: markerInfo.style,
    });

    consumed = nextLineIndex;
    currentLineIndex = nextLineIndex;
  }

  return [listItems, consumed];
};

export const buildOrderedListTokenTree = (
  items: OrderedListItem[],
  baseIndent: number,
  lexer: MarkdownLexerConfiguration
): ExtendedMarkdownToken[] => {
  const result: ExtendedMarkdownToken[] = [];
  let currentIndex = 0;

  while (currentIndex < items.length) {
    const item = items[currentIndex];

    if (item.indent !== baseIndent) {
      currentIndex += 1;
      continue;
    }

    const contentLines = item.content.split('\n');
    const mainText = contentLines[0]?.trim() || '';
    const tokens: ExtendedMarkdownToken[] = [];

    if (mainText) {
      tokens.push({
        raw: mainText,
        tokens: lexer.inlineTokens(mainText) as ExtendedMarkdownToken[],
        type: 'paragraph',
      });
    }

    const additionalContent = contentLines.slice(1).join('\n').trim();
    if (additionalContent) {
      tokens.push(
        ...(lexer.blockTokens(additionalContent) as ExtendedMarkdownToken[])
      );
    }

    let lookAheadIndex = currentIndex + 1;
    const nestedItems: OrderedListItem[] = [];

    while (
      lookAheadIndex < items.length &&
      items[lookAheadIndex].indent > baseIndent
    ) {
      nestedItems.push(items[lookAheadIndex]);
      lookAheadIndex += 1;
    }

    if (nestedItems.length > 0) {
      const nextIndent = Math.min(
        ...nestedItems.map((nestedItem) => nestedItem.indent)
      );
      const immediateChildren = nestedItems.filter(
        (nestedItem) => nestedItem.indent === nextIndent
      );
      const nestedListStyle = immediateChildren[0]?.style ?? 'decimal';
      const nestedListItems = buildOrderedListTokenTree(
        nestedItems,
        nextIndent,
        lexer
      );

      tokens.push({
        items: nestedListItems,
        listStyle: nestedListStyle,
        ordered: true,
        raw: nestedItems.map((nestedItem) => nestedItem.raw).join('\n'),
        start: immediateChildren[0]?.start ?? 1,
        type: 'list',
      });
    }

    result.push({
      raw: item.raw,
      tokens,
      type: 'list_item',
    });

    currentIndex = lookAheadIndex;
  }

  return result;
};

export const parseListItems = (
  items: MarkdownToken[],
  helpers: MarkdownParseHelpers
): JSONContent[] =>
  items.map((item) => {
    if (item.type !== 'list_item') {
      return helpers.parseChildren([item])[0];
    }

    const content: JSONContent[] = [];

    if (item.tokens && item.tokens.length > 0) {
      item.tokens.forEach((itemToken) => {
        if (
          itemToken.type === 'paragraph' ||
          itemToken.type === 'list' ||
          itemToken.type === 'blockquote' ||
          itemToken.type === 'code'
        ) {
          content.push(...helpers.parseChildren([itemToken]));
        } else if (itemToken.type === 'text' && itemToken.tokens) {
          const inlineContent = helpers.parseChildren([itemToken]);
          content.push({
            content: inlineContent,
            type: 'paragraph',
          });
        } else {
          const parsed = helpers.parseChildren([itemToken]);
          if (parsed.length > 0) {
            content.push(...parsed);
          }
        }
      });
    }

    return {
      content,
      type: 'listItem',
    };
  });

const parseOrderedMarker = (marker: string): OrderedMarkerInfo | null => {
  if (/^\d+$/.test(marker)) {
    return {
      marker,
      start: Number.parseInt(marker, 10),
      style: 'decimal',
    };
  }

  if (/^[a-z]+$/.test(marker)) {
    return {
      marker,
      start: alphaToNumber(marker),
      style: 'lower-alpha',
    };
  }

  if (/^[A-Z]+$/.test(marker)) {
    return {
      marker,
      start: alphaToNumber(marker),
      style: 'upper-alpha',
    };
  }

  return null;
};

const alphaToNumber = (value: string) =>
  value
    .toLowerCase()
    .split('')
    .reduce((accumulator, char) => {
      return accumulator * 26 + (char.charCodeAt(0) - 96);
    }, 0);

const numberToAlpha = (value: number, uppercase: boolean) => {
  let current = Math.max(1, value);
  let result = '';

  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(97 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }

  return uppercase ? result.toUpperCase() : result;
};
