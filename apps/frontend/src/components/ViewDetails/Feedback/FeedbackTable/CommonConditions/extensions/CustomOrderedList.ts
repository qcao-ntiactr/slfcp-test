import OrderedList from '@tiptap/extension-ordered-list';
import {
  type CommandProps,
  findParentNode,
  mergeAttributes,
  wrappingInputRule,
} from '@tiptap/core';

import {
  buildOrderedListTokenTree,
  parseListItems,
  parseOrderedListItems,
  type OrderedListStyle,
} from './orderedListUtils';

const orderedListInputRegex = /^([A-Z]+|[a-z]+|\d+)\.\s$/;

const getListStyleFromMarker = (marker: string): OrderedListStyle => {
  if (/^\d+$/.test(marker)) {
    return 'decimal';
  }

  return marker === marker.toUpperCase() ? 'upper-alpha' : 'lower-alpha';
};

const getStartFromMarker = (marker: string) => {
  if (/^\d+$/.test(marker)) {
    return Number.parseInt(marker, 10);
  }

  return marker
    .toLowerCase()
    .split('')
    .reduce((accumulator, char) => {
      return accumulator * 26 + (char.charCodeAt(0) - 96);
    }, 0);
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customOrderedList: {
      setOrderedListStyle: (_style: OrderedListStyle) => ReturnType;
    };
  }
}

export const CustomOrderedList = OrderedList.extend({
  name: 'orderedList',

  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'decimal',
        parseHTML: (element: HTMLElement) => {
          const type = element.getAttribute('type');

          if (type === 'a') {
            return 'lower-alpha';
          }

          if (type === 'A') {
            return 'upper-alpha';
          }

          return 'decimal';
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const listStyle = attributes.listStyle as
            | OrderedListStyle
            | undefined;

          if (listStyle === 'lower-alpha') {
            return {
              class: 'alpha-list',
              type: 'a',
            };
          }

          if (listStyle === 'upper-alpha') {
            return {
              class: 'alpha-list-upper',
              type: 'A',
            };
          }

          return {
            class: 'decimal-list',
          };
        },
      },
      type: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { start, ...attributesWithoutStart } = HTMLAttributes;

    return start === 1
      ? [
          'ol',
          mergeAttributes(this.options.HTMLAttributes, attributesWithoutStart),
          0,
        ]
      : ['ol', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  parseMarkdown: (token, helpers) => {
    if (token.type !== 'list' || !token.ordered) {
      return [];
    }

    const startValue = token.start || 1;
    const listStyle =
      'listStyle' in token && token.listStyle ? token.listStyle : 'decimal';
    const content = token.items ? parseListItems(token.items, helpers) : [];

    return {
      attrs: {
        listStyle,
        ...(startValue !== 1 ? { start: startValue } : {}),
      },
      content,
      type: 'orderedList',
    };
  },

  renderMarkdown: (node, h) => {
    if (!node.content) {
      return '';
    }

    return h.renderChildren(node.content, '\n');
  },

  markdownTokenizer: {
    name: 'orderedList',
    level: 'block',
    start: (src: string) => {
      const match = src.match(/^(\s*)(\d+|[a-z]+|[A-Z]+)\.\s+/);
      const index = match?.index;
      return index !== undefined ? index : -1;
    },
    tokenize: (src: string, _tokens, lexer) => {
      const lines = src.split('\n');
      const [listItems, consumed] = parseOrderedListItems(lines);

      if (listItems.length === 0) {
        return undefined;
      }

      const items = buildOrderedListTokenTree(listItems, 0, lexer);

      if (items.length === 0) {
        return undefined;
      }

      return {
        items,
        listStyle: listItems[0]?.style ?? 'decimal',
        ordered: true,
        raw: lines.slice(0, consumed).join('\n'),
        start: listItems[0]?.start ?? 1,
        type: 'list',
      } as unknown as object;
    },
  },

  addCommands() {
    return {
      toggleOrderedList:
        (style: OrderedListStyle = 'decimal') =>
        ({ commands, chain }) => {
          if (this.options.keepAttributes) {
            return chain()
              .toggleList(
                this.name,
                this.options.itemTypeName,
                this.options.keepMarks,
                { listStyle: style }
              )
              .updateAttributes(
                'listItem',
                this.editor.getAttributes('textStyle')
              )
              .run();
          }

          return commands.toggleList(
            this.name,
            this.options.itemTypeName,
            this.options.keepMarks,
            { listStyle: style }
          );
        },
      setOrderedListStyle:
        (style: OrderedListStyle) =>
        ({ state, chain, commands, tr }: CommandProps) => {
          const parentList = findParentNode((node) => node.type === this.type)(
            state.selection
          );

          if (!parentList) {
            return commands.toggleList(
              this.name,
              this.options.itemTypeName,
              this.options.keepMarks,
              { listStyle: style }
            );
          }

          return chain()
            .command(() => {
              tr.setNodeMarkup(parentList.pos, this.type, {
                ...parentList.node.attrs,
                listStyle: style,
              });

              return true;
            })
            .run();
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: orderedListInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          listStyle: getListStyleFromMarker(match[1]),
          start: getStartFromMarker(match[1]),
        }),
        joinPredicate: (match, node) => {
          const start = getStartFromMarker(match[1]);
          const style = getListStyleFromMarker(match[1]);
          return (
            node.attrs.listStyle === style &&
            node.childCount + node.attrs.start === start
          );
        },
      }),
    ];
  },
});
