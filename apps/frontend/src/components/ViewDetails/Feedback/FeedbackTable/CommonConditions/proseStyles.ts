import type { SystemStyleObject } from '@chakra-ui/react';

const sharedCommonConditionsProseStyles: SystemStyleObject = {
  color: 'gray.800',
  fontFamily: 'body',
  lineHeight: 'tall',
  wordBreak: 'break-word',
  '> *:first-of-type': {
    mt: 0,
  },
  '> *:last-child': {
    mb: 0,
  },
  p: {
    mb: 4,
  },
  'strong, b': {
    fontWeight: 'bold',
  },
  blockquote: {
    borderLeft: '4px solid',
    borderColor: 'gray.300',
    color: 'gray.700',
    fontStyle: 'italic',
    my: 4,
    pl: 4,
  },
  ul: {
    listStyleType: 'disc',
    mb: 4,
    paddingInlineStart: '1.5rem',
  },
  ol: {
    mb: 4,
    paddingInlineStart: '1.5rem',
  },
  'li > ul, li > ol': {
    marginTop: 1,
    paddingInlineStart: '1rem',
  },
  'li > ol.alpha-list, li > ol.alpha-list-upper, li > ol.decimal-list': {
    marginInlineStart: '1rem',
  },
  'ol.alpha-list': {
    counterReset: 'lower-alpha-list',
    listStyle: 'none',
    paddingInlineStart: 0,
  },
  'ol.alpha-list-upper': {
    counterReset: 'upper-alpha-list',
    listStyle: 'none',
    paddingInlineStart: 0,
  },
  'ol.decimal-list': {
    counterReset: 'decimal-list',
    listStyle: 'none',
    paddingInlineStart: 0,
  },
  li: {
    mb: 0.5,
  },
  'li > p': {
    mb: 1,
  },
  'li > p:last-of-type': {
    mb: 0,
  },
  'ol.alpha-list > li': {
    counterIncrement: 'lower-alpha-list',
    paddingInlineStart: '2rem',
    position: 'relative',
  },
  'ol.alpha-list > li::before': {
    content: 'counter(lower-alpha-list, lower-alpha) "."',
    fontVariantNumeric: 'tabular-nums',
    insetInlineStart: 0,
    position: 'absolute',
    textAlign: 'left',
    width: '1.5rem',
  },
  'ol.alpha-list-upper > li': {
    counterIncrement: 'upper-alpha-list',
    paddingInlineStart: '2rem',
    position: 'relative',
  },
  'ol.alpha-list-upper > li::before': {
    content: 'counter(upper-alpha-list, upper-alpha) "."',
    fontVariantNumeric: 'tabular-nums',
    insetInlineStart: 0,
    position: 'absolute',
    textAlign: 'left',
    width: '1.5rem',
  },
  'ol.decimal-list > li': {
    counterIncrement: 'decimal-list',
    paddingInlineStart: '2rem',
    position: 'relative',
  },
  'ol.decimal-list > li::before': {
    content: 'counter(decimal-list) "."',
    fontVariantNumeric: 'tabular-nums',
    insetInlineStart: 0,
    position: 'absolute',
    textAlign: 'left',
    width: '1.5rem',
  },
  a: {
    color: 'blue.600',
    textDecoration: 'underline',
  },
  img: {
    borderRadius: 'md',
    display: 'inline-block',
    marginY: 1,
    verticalAlign: 'baseline',
    maxWidth: '100%',
  },
  'img.ProseMirror-selectednode': {
    outline: '2px solid',
    outlineColor: 'blue.400',
    outlineOffset: '2px',
  },
  mark: {
    backgroundColor: 'yellow.200',
    borderRadius: 'sm',
    paddingInline: 1,
  },
};

export const commonConditionsProseStyles: SystemStyleObject = {
  ...sharedCommonConditionsProseStyles,
  h1: {
    fontSize: '2xl',
    fontWeight: 'bold',
    lineHeight: 'shorter',
    mb: 4,
    mt: 6,
  },
  h2: {
    fontSize: 'xl',
    fontWeight: 'semibold',
    lineHeight: 'shorter',
    mb: 3,
    mt: 5,
  },
  h3: {
    fontSize: 'lg',
    fontWeight: 'semibold',
    lineHeight: 'shorter',
    mb: 3,
    mt: 4,
  },
};

export const compactCommonConditionsProseStyles: SystemStyleObject = {
  ...sharedCommonConditionsProseStyles,
  h1: {
    fontSize: 'lg',
    fontWeight: 'bold',
    lineHeight: 'short',
    mb: 3,
    mt: 4,
  },
  h2: {
    fontSize: 'md',
    fontWeight: 'semibold',
    lineHeight: 'short',
    mb: 2,
    mt: 3,
  },
  h3: {
    fontSize: 'sm',
    fontWeight: 'semibold',
    lineHeight: 'short',
    mb: 2,
    mt: 3,
  },
};
