import { type JSONContent, mergeAttributes, Node } from '@tiptap/core';

import { getMarkerForIndex, type OrderedListStyle } from './orderedListUtils';

type ListItemRenderContext = {
  index: number;
  meta?: {
    parentAttrs?: {
      listStyle?: OrderedListStyle;
      start?: number;
    };
  };
  parentType?: string | null;
};

export const CustomListItem = Node.create({
  name: 'listItem',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'paragraph block*',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'li',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  markdownTokenName: 'list_item',

  parseMarkdown: (token, helpers) => {
    if (token.type !== 'list_item') {
      return [];
    }

    let content: JSONContent[] = [];

    if (token.tokens && token.tokens.length > 0) {
      const hasParagraphTokens = token.tokens.some(
        (nestedToken) => nestedToken.type === 'paragraph'
      );

      if (hasParagraphTokens) {
        content = helpers.parseChildren(token.tokens);
      } else {
        const firstToken = token.tokens[0];

        if (
          firstToken &&
          firstToken.type === 'text' &&
          firstToken.tokens &&
          firstToken.tokens.length > 0
        ) {
          const inlineContent = helpers.parseInline(firstToken.tokens);

          content = [
            {
              content: inlineContent,
              type: 'paragraph',
            },
          ];

          if (token.tokens.length > 1) {
            const remainingTokens = token.tokens.slice(1);
            const additionalContent = helpers.parseChildren(remainingTokens);
            content.push(...additionalContent);
          }
        } else {
          content = helpers.parseChildren(token.tokens);
        }
      }
    }

    if (content.length === 0) {
      content = [
        {
          content: [],
          type: 'paragraph',
        },
      ];
    }

    return {
      content,
      type: 'listItem',
    };
  },

  renderMarkdown: (node, h, ctx: ListItemRenderContext) => {
    const content = Array.isArray(node.content) ? node.content : [];
    if (content.length === 0) {
      return '';
    }

    const prefix = (() => {
      if (ctx.parentType === 'bulletList') {
        return '- ';
      }

      if (ctx.parentType === 'orderedList') {
        const listStyle = ctx.meta?.parentAttrs?.listStyle ?? 'decimal';
        const start = ctx.meta?.parentAttrs?.start ?? 1;

        return `${getMarkerForIndex(listStyle, start, ctx.index)} `;
      }

      return '- ';
    })();

    const [firstChild, ...restChildren] = content;
    const lines = [`${prefix}${h.renderChildren([firstChild])}`];

    if (restChildren.length > 0) {
      const renderedRest = h.renderChildren(restChildren, '\n');

      if (renderedRest) {
        lines.push(
          ...renderedRest
            .split('\n')
            .map((line) => (line ? h.indent(line) : line))
        );
      }
    }

    return lines.join('\n');
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    };
  },
});
