const STANDALONE_IMAGE_URL_RE =
  /^(\s*)(https?:\/\/\S+\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:\?\S*)?(?:#\S*)?)\s*$/i;

const INLINE_UNDERLINE_HTML_RE = /<u>([\s\S]+?)<\/u>/i;
const INLINE_UNDERLINE_PLUS_RE = /\+\+([\s\S]+?)\+\+/;
const INLINE_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/;
const INLINE_LINK_RE = /\[\[([^\]]+)\]\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/;
const INLINE_HIGHLIGHT_RE = /==([^=\n]+)==/;
const INLINE_BOLD_RE = /(\*\*|__)([\s\S]+?)\1/;
const INLINE_ITALIC_RE = /(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/;
const INLINE_STRIKE_RE = /~~([\s\S]+?)~~/;
const INLINE_CODE_RE = /`([^`]+)`/;
const LIST_ITEM_RE = /^(\s*)([-+*]|(?:\d+|[a-zA-Z]+)[.)])\s+(.*?)(\s{2,})?$/;

export const HIGHLIGHT_TOKEN_RE = /==([^=\n]+)==/g;

type ListType = 'ul' | 'ol';

type ListContext = {
  indent: number;
  type: ListType;
};

type HtmlVariant = 'readonly' | 'email';

type HtmlTheme = {
  bodyColor: string;
  bodyFontSize: string;
  bodyLineHeight: string;
  headingSizes: Record<number, string>;
  paragraphMarginBottom: string;
  listMarginBottom: string;
  listIndent: number;
  nestedListIndentStep: number;
  blockQuoteColor: string;
  blockQuoteBorder: string;
  linkColor: string;
  highlightBackground: string;
  codeBackground: string;
  openLinksInNewTab: boolean;
};

const HTML_THEMES: Record<HtmlVariant, HtmlTheme> = {
  email: {
    bodyColor: '#111827',
    bodyFontSize: '14px',
    bodyLineHeight: '1.5',
    headingSizes: {
      1: '24px',
      2: '20px',
      3: '18px',
      4: '16px',
      5: '14px',
      6: '13px',
    },
    paragraphMarginBottom: '12px',
    listMarginBottom: '12px',
    listIndent: 24,
    nestedListIndentStep: 12,
    blockQuoteColor: '#334155',
    blockQuoteBorder: '#cbd5e1',
    linkColor: '#005ea2',
    highlightBackground: '#fff3b0',
    codeBackground: '#f3f4f6',
    openLinksInNewTab: false,
  },
  readonly: {
    bodyColor: '#1a202c',
    bodyFontSize: '14px',
    bodyLineHeight: '1.5',
    headingSizes: {
      1: '18px',
      2: '16px',
      3: '14px',
      4: '14px',
      5: '13px',
      6: '12px',
    },
    paragraphMarginBottom: '10px',
    listMarginBottom: '10px',
    listIndent: 20,
    nestedListIndentStep: 12,
    blockQuoteColor: '#4a5568',
    blockQuoteBorder: '#cbd5e0',
    linkColor: '#2b6cb0',
    highlightBackground: '#faf089',
    codeBackground: '#edf2f7',
    openLinksInNewTab: true,
  },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSafeLink(href: string) {
  if (!href) return false;
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
}

export function isSafeImage(src: string) {
  if (!src) return false;
  return /^https?:\/\//i.test(src);
}

export function normalizeCommonConditionsMarkdown(markdown?: string | null) {
  if (!markdown?.trim()) return '';

  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/^\s*&nbsp;\s*$/gim, '')
    .split('\n')
    .map((line) => {
      const match = line.match(STANDALONE_IMAGE_URL_RE);
      if (!match) return line;

      const [, leadingWhitespace, url] = match;
      if (!isSafeImage(url)) return line;

      return `${leadingWhitespace}![image](${url})`;
    })
    .join('\n')
    .trim();
}

function getUnorderedListMarker(_marker: string) {
  return '\u2022';
}

function renderInline(markdown: string, theme: HtmlTheme): string {
  const source = markdown ?? '';
  let html = '';
  let cursor = 0;

  while (cursor < source.length) {
    const remaining = source.slice(cursor);
    const candidates = [
      {
        type: 'underlineHtml',
        match: remaining.match(INLINE_UNDERLINE_HTML_RE),
      },
      {
        type: 'underlinePlus',
        match: remaining.match(INLINE_UNDERLINE_PLUS_RE),
      },
      { type: 'image', match: remaining.match(INLINE_IMAGE_RE) },
      { type: 'link', match: remaining.match(INLINE_LINK_RE) },
      { type: 'highlight', match: remaining.match(INLINE_HIGHLIGHT_RE) },
      { type: 'bold', match: remaining.match(INLINE_BOLD_RE) },
      { type: 'italic', match: remaining.match(INLINE_ITALIC_RE) },
      { type: 'strike', match: remaining.match(INLINE_STRIKE_RE) },
      { type: 'code', match: remaining.match(INLINE_CODE_RE) },
    ]
      .filter(
        (
          candidate
        ): candidate is {
          type: string;
          match: RegExpMatchArray;
        } => Boolean(candidate.match && candidate.match.index !== undefined)
      )
      .sort(
        (left, right) =>
          (left.match.index ?? Number.POSITIVE_INFINITY) -
          (right.match.index ?? Number.POSITIVE_INFINITY)
      );

    if (!candidates.length) {
      html += escapeHtml(remaining);
      break;
    }

    const next = candidates[0];
    const [fullMatch, ...groups] = next.match;
    const matchIndex = next.match.index ?? 0;

    if (matchIndex > 0) {
      html += escapeHtml(remaining.slice(0, matchIndex));
    }

    switch (next.type) {
      case 'underlineHtml':
        html += `<u>${renderInline(groups[0], theme)}</u>`;
        break;
      case 'underlinePlus':
        html += `<u>${renderInline(groups[0], theme)}</u>`;
        break;
      case 'image': {
        const altText = groups[0]?.trim() || 'image';
        const src = groups[1]?.trim();
        html += isSafeImage(src)
          ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(altText)}" style="max-width:100%;height:auto;display:block;margin:8px 0;" referrerpolicy="no-referrer" />`
          : escapeHtml(fullMatch);
        break;
      }
      case 'link': {
        const doubleBracketText = groups[0];
        const doubleBracketHref = groups[1]?.trim();
        const markdownText = groups[2];
        const markdownHref = groups[3]?.trim();
        const text = doubleBracketText ?? markdownText ?? '';
        const href = doubleBracketHref ?? markdownHref;
        const linkTargetAttributes = theme.openLinksInNewTab
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
        html += isSafeLink(href)
          ? `<a href="${escapeHtml(href)}"${linkTargetAttributes} style="color:${theme.linkColor};text-decoration:underline;">${renderInline(
              text,
              theme
            )}</a>`
          : escapeHtml(fullMatch);
        break;
      }
      case 'highlight':
        html += `<span style="background-color:${theme.highlightBackground};color:inherit;padding:0 2px;">${renderInline(
          groups[0],
          theme
        )}</span>`;
        break;
      case 'bold':
        html += `<strong>${renderInline(groups[1], theme)}</strong>`;
        break;
      case 'italic':
        html += `<em>${renderInline(groups[0] || groups[1] || '', theme)}</em>`;
        break;
      case 'strike':
        html += `<del>${renderInline(groups[0], theme)}</del>`;
        break;
      case 'code':
        html += `<code style="font-family:SFMono-Regular,Consolas,monospace;background-color:${theme.codeBackground};padding:1px 4px;border-radius:4px;">${escapeHtml(
          groups[0]
        )}</code>`;
        break;
    }

    cursor += matchIndex + fullMatch.length;
  }

  return html;
}

function renderListItem(
  content: string,
  list: ListContext,
  sourceMarker: string,
  theme: HtmlTheme,
  variant: HtmlVariant
) {
  const marker =
    list.type === 'ol' ? sourceMarker : getUnorderedListMarker(sourceMarker);
  const marginLeft =
    theme.listIndent + list.indent * theme.nestedListIndentStep;
  const renderedMarker = escapeHtml(marker);
  const renderedContent = renderInline(content, theme);

  if (variant === 'email') {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;margin:0 0 ${theme.listMarginBottom};"><tr><td style="width:${marginLeft}px;font-size:0;line-height:0;">&nbsp;</td><td valign="top" style="width:24px;padding:0 8px 0 0;white-space:nowrap;">${renderedMarker}</td><td valign="top">${renderedContent}</td></tr></table>`;
  }

  return `<div style="margin:0 0 ${theme.listMarginBottom} ${marginLeft}px;"><span style="display:inline-block;min-width:24px;">${renderedMarker}</span><span>${renderedContent}</span></div>`;
}

export function renderCommonConditionsHtml(
  markdown?: string | null,
  options?: { variant?: HtmlVariant }
) {
  const normalized = normalizeCommonConditionsMarkdown(markdown);
  if (!normalized) return '';

  const theme = HTML_THEMES[options?.variant ?? 'readonly'];
  const lines = normalized.split('\n');
  const htmlParts: string[] = [];
  const listStack: ListContext[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    htmlParts.push(
      `<p style="margin:0 0 ${theme.paragraphMarginBottom};">${paragraphLines
        .map((paragraphLine) => renderInline(paragraphLine, theme))
        .join('<br />')}</p>`
    );
    paragraphLines = [];
  };

  const closeLists = (minIndent: number) => {
    while (
      listStack.length &&
      listStack[listStack.length - 1].indent >= minIndent
    ) {
      listStack.pop();
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/u, '');
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeLists(0);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeLists(0);
      const level = headingMatch[1].length;
      htmlParts.push(
        `<h${level} style="margin:0 0 ${theme.paragraphMarginBottom};font-size:${theme.headingSizes[level]};line-height:1.3;">${renderInline(
          headingMatch[2],
          theme
        )}</h${level}>`
      );
      continue;
    }

    const blockQuoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockQuoteMatch) {
      flushParagraph();
      closeLists(0);
      htmlParts.push(
        `<blockquote style="margin:0 0 ${theme.paragraphMarginBottom};padding-left:12px;border-left:4px solid ${theme.blockQuoteBorder};color:${theme.blockQuoteColor};"><p style="margin:0;">${renderInline(
          blockQuoteMatch[1],
          theme
        )}</p></blockquote>`
      );
      continue;
    }

    const listMatch = line.match(LIST_ITEM_RE);
    if (listMatch) {
      flushParagraph();
      const [, indentation, marker, content] = listMatch;
      const indent = indentation.replace(/\t/g, '  ').length;
      const nextType: ListType = /^[-+*]$/.test(marker) ? 'ul' : 'ol';

      while (
        listStack.length &&
        listStack[listStack.length - 1].indent > indent
      ) {
        listStack.pop();
      }

      const current = listStack[listStack.length - 1];
      if (!current || current.indent < indent) {
        const nextList = {
          indent,
          type: nextType,
        };
        htmlParts.push(
          renderListItem(
            content,
            nextList,
            marker,
            theme,
            options?.variant ?? 'readonly'
          )
        );
        listStack.push(nextList);
        continue;
      }

      if (current.type !== nextType) {
        closeLists(indent);
        const nextList = {
          indent,
          type: nextType,
        };
        htmlParts.push(
          renderListItem(
            content,
            nextList,
            marker,
            theme,
            options?.variant ?? 'readonly'
          )
        );
        listStack.push(nextList);
        continue;
      }

      htmlParts.push(
        renderListItem(
          content,
          current,
          marker,
          theme,
          options?.variant ?? 'readonly'
        )
      );
      continue;
    }

    closeLists(0);
    paragraphLines.push(trimmed);
  }

  flushParagraph();

  return htmlParts.join('');
}

export function renderCommonConditionsText(markdown?: string | null) {
  const normalized = normalizeCommonConditionsMarkdown(markdown);
  if (!normalized) return '';

  return normalized
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, altText, url) =>
      altText?.trim() ? `${altText} (${url})` : url
    )
    .replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, (_match, text, url) =>
      text.trim() === url.trim() ? text : `${text} (${url})`
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) =>
      text.trim() === url.trim() ? text : `${text} (${url})`
    )
    .replace(/==([^=\n]+)==/g, '$1')
    .replace(/\+\+([\s\S]+?)\+\+/g, '$1')
    .replace(/<u>([\s\S]+?)<\/u>/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^(\s*)[-+*]\s+/gm, '$1• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
