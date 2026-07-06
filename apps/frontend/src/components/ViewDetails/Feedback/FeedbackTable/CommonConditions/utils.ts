import {
  HIGHLIGHT_TOKEN_RE,
  isSafeImage,
  isSafeLink,
  normalizeCommonConditionsMarkdown,
} from '@slfcp/normalize-markdown';

import type { CommonCondition } from './types';

type RemarkNode = {
  type?: string;
  value?: string;
  children?: RemarkNode[];
  data?: {
    hName?: string;
  };
};

type RemarkTransformer = (_tree: RemarkNode) => void;

// Plugins
export {
  HIGHLIGHT_TOKEN_RE,
  isSafeImage,
  isSafeLink,
  normalizeCommonConditionsMarkdown,
};

export function buildCommonConditionInsertionMarkdown({
  title,
  content,
}: Pick<CommonCondition, 'title' | 'content'>) {
  const heading = `# ${title.trim()}`;

  if (!content.trim()) {
    return heading;
  }

  return `${heading}\n\n${content}`;
}

export function remarkHighlightToken(): RemarkTransformer {
  function splitTextNode(value: string): RemarkNode[] {
    const nodes: RemarkNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    HIGHLIGHT_TOKEN_RE.lastIndex = 0;

    while ((match = HIGHLIGHT_TOKEN_RE.exec(value)) !== null) {
      if (match.index > lastIndex) {
        nodes.push({
          type: 'text',
          value: value.slice(lastIndex, match.index),
        });
      }

      nodes.push({
        type: 'strong',
        data: { hName: 'mark' },
        children: [{ type: 'text', value: match[1] }],
      });

      lastIndex = HIGHLIGHT_TOKEN_RE.lastIndex;
    }

    if (lastIndex < value.length) {
      nodes.push({ type: 'text', value: value.slice(lastIndex) });
    }

    return nodes.length ? nodes : [{ type: 'text', value }];
  }

  function walk(node?: RemarkNode): void {
    if (!node || !Array.isArray(node.children)) return;

    const nextChildren: RemarkNode[] = [];
    for (const child of node.children) {
      if (child?.type === 'text' && typeof child.value === 'string') {
        nextChildren.push(...splitTextNode(child.value));
      } else {
        walk(child);
        nextChildren.push(child);
      }
    }
    node.children = nextChildren;
  }

  return (tree: RemarkNode): void => {
    walk(tree);
  };
}
