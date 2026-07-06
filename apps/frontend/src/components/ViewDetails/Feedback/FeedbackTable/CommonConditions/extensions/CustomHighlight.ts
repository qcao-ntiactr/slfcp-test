import Highlight from '@tiptap/extension-highlight';
import { markInputRule } from '@tiptap/core';

type MarkdownItStateInline = {
  pos: number;
  posMax: number;
  src: string;
  md: {
    inline: {
      tokenize: (_state: MarkdownItStateInline) => void;
    };
  };
  push: (
    _tokenType: string,
    _tag: string,
    _nesting: number
  ) => { markup: string };
};

type MarkdownItLike = {
  inline: {
    ruler: {
      before: (
        _beforeName: string,
        _ruleName: string,
        _rule: (_state: MarkdownItStateInline, _silent: boolean) => boolean
      ) => void;
    };
  };
  use: (_plugin: (_md: MarkdownItLike) => void) => void;
};

export const CustomHighlight = Highlight.extend({
  addInputRules() {
    return [
      markInputRule({
        find: /(?:^|\s)(==([^=\n]+)==)$/,
        type: this.type,
      }),
    ];
  },
  addStorage() {
    return {
      markdown: {
        serialize: {
          open: '==',
          close: '==',
        },
        parse: {
          setup(markdownit: MarkdownItLike) {
            markdownit.use((md) => {
              md.inline.ruler.before(
                'emphasis',
                'mark',
                (state: MarkdownItStateInline, silent: boolean) => {
                  const start = state.pos;
                  if (state.src.charCodeAt(start) !== 0x3d /* = */)
                    return false;
                  if (state.src.charCodeAt(start + 1) !== 0x3d /* = */)
                    return false;

                  let pos = start + 2;
                  while (pos < state.posMax) {
                    if (
                      state.src.charCodeAt(pos) === 0x3d &&
                      state.src.charCodeAt(pos + 1) === 0x3d
                    ) {
                      if (!silent) {
                        const token = state.push('mark_open', 'mark', 1);
                        token.markup = '==';
                        state.pos = start + 2;
                        state.posMax = pos;
                        state.md.inline.tokenize(state);
                        state.push('mark_close', 'mark', -1);
                        state.pos = pos + 2;
                        state.posMax = state.src.length;
                      }
                      return true;
                    }
                    pos++;
                  }
                  return false;
                }
              );
            });
          },
        },
      },
    };
  },
});
