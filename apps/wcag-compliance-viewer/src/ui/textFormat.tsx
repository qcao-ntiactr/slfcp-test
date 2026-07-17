import { Box, Code, Text } from '@chakra-ui/react';

type ParsedList = {
  intro: string;
  items: string[];
};

function parseInlineNumberedList(value: string): ParsedList | null {
  const matches = [...value.matchAll(/(?:^|\s)(\d+)[).]\s+/g)];
  if (matches.length === 0) return null;

  const firstMatch = matches[0];
  if (firstMatch.index !== 0 && matches.length < 2) return null;

  const intro = value.slice(0, firstMatch.index).trim();
  const items = matches
    .map((match, index) => {
      const itemStart = (match.index ?? 0) + match[0].length;
      const itemEnd = matches[index + 1]?.index ?? value.length;
      return value.slice(itemStart, itemEnd).trim();
    })
    .filter(Boolean);

  return items.length > 0 ? { intro, items } : null;
}

function parseDashStepList(value: string): ParsedList | null {
  const matches = [...value.matchAll(/(?:^|\n|\s)-\s+/g)];
  if (matches.length === 0) return null;

  const firstMatch = matches[0];
  if (firstMatch.index !== 0 && matches.length < 2) return null;

  const intro = value.slice(0, firstMatch.index).trim();
  const items = matches
    .map((match, index) => {
      const itemStart = (match.index ?? 0) + match[0].length;
      const itemEnd = matches[index + 1]?.index ?? value.length;
      return value.slice(itemStart, itemEnd).trim();
    })
    .filter(Boolean);

  return items.length > 0 ? { intro, items } : null;
}

export function formatInlineText(value: string) {
  const inlineCodePattern = /`[^`]+`|https?:\/\/[^\s),.;]+|<\/?[a-z][a-z0-9-]*(?:\s+[A-Za-z_:][-A-Za-z0-9_:.]*(?:="[^"]*"|='[^']*'|=\{[^}]+\})?)*\s*\/?>|\bh[1-6]\b|[A-Za-z_:][-A-Za-z0-9_:.]*(?:="[^"]*"|='[^']*'|=\{[^}]+\})|(?:[\w.-]+\/)+[\w.-]+|[\w.-]+\.(?:tsx?|jsx?|css|html|json|ya?ml|md|mjs|cjs)|[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+|\/[a-z0-9][a-z0-9/_-]*|(?:^|[\s(,])\/(?=$|[\s),.;])/g;
  const segments = [];
  let currentIndex = 0;

  for (const match of value.matchAll(inlineCodePattern)) {
    const matchIndex = match.index ?? 0;
    const rawSegment = match[0];
    const rootRoutePrefix = rawSegment.match(/^([\s(,])\/$/)?.[1] ?? '';
    const segment = rootRoutePrefix ? '/' : rawSegment;

    if (matchIndex > currentIndex) {
      segments.push(value.slice(currentIndex, matchIndex));
    }

    if (rootRoutePrefix) {
      segments.push(rootRoutePrefix);
    }

    if (shouldRenderAsCode(segment)) {
      segments.push(
        <Code
          key={`${segment}-${matchIndex}`}
          colorScheme="gray"
          fontSize="0.92em"
          whiteSpace="normal"
          wordBreak="break-word"
        >
          {segment.startsWith('`') && segment.endsWith('`')
            ? segment.slice(1, -1)
            : segment}
        </Code>
      );
    } else {
      segments.push(segment);
    }

    currentIndex = matchIndex + rawSegment.length;
  }

  if (currentIndex < value.length) {
    segments.push(value.slice(currentIndex));
  }

  return segments;
}

function shouldRenderAsCode(segment: string) {
  return (
    (segment.startsWith('`') && segment.endsWith('`')) ||
    /^https?:\/\//i.test(segment) ||
    /^\/(?:[a-z0-9][a-z0-9/_-]*)?$/i.test(segment) ||
    /^<\/?[a-z][a-z0-9-]*(?:\s+[A-Za-z_:][-A-Za-z0-9_:.]*(?:="[^"]*"|='[^']*'|=\{[^}]+\})?)*\s*\/?>$/.test(segment) ||
    /^h[1-6]$/.test(segment) ||
    /^[A-Za-z_:][-A-Za-z0-9_:.]*(?:="[^"]*"|='[^']*'|=\{[^}]+\})$/.test(segment) ||
    /^(?:[\w.-]+\/)+[\w.-]+$/.test(segment) ||
    /^[\w.-]+\.(?:tsx?|jsx?|css|html|json|ya?ml|md|mjs|cjs)$/.test(segment) ||
    /^[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+$/.test(segment)
  );
}

export function formatText(value: string) {
  const normalizedValue = value.replace(/<br>/g, '\n');
  const fullOrderedList =
    parseInlineNumberedList(normalizedValue) ?? parseDashStepList(normalizedValue);

  if (fullOrderedList) {
    return <FormattedList parsedList={fullOrderedList} />;
  }

  const parts = value.split('<br>').map((part) => part.trim()).filter(Boolean);

  return parts.map((part, index) => (
    <Box key={`${part}-${index}`} mb={index === parts.length - 1 ? 0 : 2}>
      <FormattedParagraph value={part} />
    </Box>
  ));
}

function FormattedParagraph({ value }: { value: string }) {
  const orderedList = parseInlineNumberedList(value) ?? parseDashStepList(value);

  if (orderedList) {
    return <FormattedList parsedList={orderedList} />;
  }

  return (
    <Text overflowWrap="anywhere" wordBreak="break-word">
      {formatInlineText(value)}
    </Text>
  );
}

function FormattedList({ parsedList }: { parsedList: ParsedList }) {
  return (
    <Box>
      {parsedList.intro && (
        <Text mb={2} overflowWrap="anywhere" wordBreak="break-word">
          {formatInlineText(parsedList.intro)}
        </Text>
      )}
      <Box as="ol" pl={5}>
        {parsedList.items.map((item, itemIndex) => (
          <Text
            key={`${item}-${itemIndex}`}
            as="li"
            mb={itemIndex === parsedList.items.length - 1 ? 0 : 2}
            overflowWrap="anywhere"
            wordBreak="break-word"
          >
            {formatInlineText(item)}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
