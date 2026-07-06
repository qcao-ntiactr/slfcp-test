import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Box, FormLabel, Text } from '@chakra-ui/react';
import { JSONContent, getMarkRange } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Markdown } from '@tiptap/markdown';

import { CustomHighlight } from './extensions/CustomHighlight';
import { CustomImage } from './extensions/CustomImage';
import { CustomLink } from './extensions/CustomLink';
import { CustomListItem } from './extensions/CustomListItem';
import { CustomOrderedList } from './extensions/CustomOrderedList';
import {
  isSafeImage,
  isSafeLink,
  normalizeCommonConditionsMarkdown,
} from './utils';
import { CommonConditionsEditorToolbar } from './CommonConditionsEditorToolbar';
import { commonConditionsProseStyles } from './proseStyles';

type CommonConditionsEditorProps = {
  value: string;
  onChange: (_nextValue: string) => void;
  isDisabled?: boolean;
  descriptionText?: string;
};

export type CommonConditionsEditorLinkFormState = {
  text: string;
  url: string;
  canRemove: boolean;
  focusField: 'text' | 'url';
  isEditingLink: boolean;
};

export type CommonConditionsEditorHandle = {
  insertCondition: (_markdown: string) => boolean;
};

export const CommonConditionsEditor = forwardRef<
  CommonConditionsEditorHandle,
  CommonConditionsEditorProps
>(({ value, onChange, isDisabled = false, descriptionText }, ref) => {
  const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const lastEmittedMarkdownRef = useRef<string | null>(null);
  const editorDescriptionId = useId();
  const [isModifierKeyPressed, setIsModifierKeyPressed] = useState(false);

  const EMPTY_PARAGRAPH: JSONContent = { type: 'paragraph' };

  const normalizeImportedConditionMarkdown = (markdown: string) =>
    normalizeCommonConditionsMarkdown(
      markdown.replace(/\n\s*&nbsp;\s*$/i, '').trimEnd()
    );

  const buildConditionContent = (markdown: string): JSONContent[] => {
    const normalizedMarkdown = normalizeImportedConditionMarkdown(markdown);
    const parsedContent = editor?.markdown?.parse(normalizedMarkdown);
    const content =
      parsedContent?.type === 'doc'
        ? (parsedContent.content ?? [])
        : parsedContent
          ? [parsedContent]
          : [];

    const hasExistingContent = editor?.getMarkdown().trim().length
      ? true
      : false;

    return [
      ...(hasExistingContent ? [EMPTY_PARAGRAPH] : []),
      ...content,
      EMPTY_PARAGRAPH,
    ];
  };

  const getCurrentSelectionRange = () => {
    if (!editor) {
      return { from: 0, to: 0 };
    }

    return lastSelectionRef.current ?? editor.state.selection;
  };

  const getCurrentLinkRange = () => {
    if (!editor) return null;

    const linkType = editor.state.schema.marks.link;
    if (!linkType) return null;

    const selection = getCurrentSelectionRange();
    const resolvedPos = editor.state.doc.resolve(selection.from);
    return getMarkRange(resolvedPos, linkType);
  };

  const getActiveLinkContext = () => {
    if (!editor) return null;

    const selection = getCurrentSelectionRange();
    const linkRange =
      selection.from === selection.to
        ? (() => {
            if (selection.from <= 1) return null;

            const linkType = editor.state.schema.marks.link;
            if (!linkType) return null;

            const resolvedPos = editor.state.doc.resolve(selection.from - 1);
            const range = getMarkRange(resolvedPos, linkType);

            if (!range) return null;

            return range.from < selection.from && selection.from < range.to
              ? range
              : null;
          })()
        : getCurrentLinkRange();

    if (!linkRange) return null;

    const isWithinSingleLink =
      selection.from >= linkRange.from && selection.to <= linkRange.to;

    if (!isWithinSingleLink) return null;

    return linkRange;
  };

  const hasMixedLinkSelection = () => {
    if (!editor) return false;

    const selection = getCurrentSelectionRange();
    if (selection.from === selection.to) return false;

    let containsLink = false;
    let containsPlainText = false;

    editor.state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
      if (!node.isText) return;

      const rangeStart = Math.max(selection.from, pos);
      const rangeEnd = Math.min(selection.to, pos + node.nodeSize);

      if (rangeEnd <= rangeStart) return;

      const hasLinkMark = node.marks.some((mark) => mark.type.name === 'link');
      if (hasLinkMark) {
        containsLink = true;
      } else {
        containsPlainText = true;
      }
    });

    return containsLink && containsPlainText;
  };

  const getCurrentText = (from: number, to: number) =>
    editor?.state.doc.textBetween(from, to, ' ') ?? '';

  const editor = useEditor({
    extensions: [
      CustomHighlight,
      StarterKit.configure({
        link: false,
        listItem: false,
        orderedList: false,
        horizontalRule: false,
        strike: false,
        underline: false,
      }),
      CustomListItem,
      CustomOrderedList,
      CustomLink.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ['http', 'https', 'mailto'],
        validate: (href) => isSafeLink(href),
      }),
      CustomImage,
      Underline,
      Markdown,
    ],
    content: '',
    onUpdate: ({ editor: currentEditor }) => {
      const nextMarkdown = currentEditor.getMarkdown();
      lastEmittedMarkdownRef.current =
        normalizeImportedConditionMarkdown(nextMarkdown);
      onChange(nextMarkdown);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection;
      lastSelectionRef.current = { from, to };
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
        'aria-label': 'Condition details editor',
        'aria-describedby': editorDescriptionId,
      },
      handleDrop: (_, event, __, moved) => {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files.length > 0
        ) {
          const isImage = Array.from(event.dataTransfer.files).some((file) =>
            file.type.startsWith('image/')
          );
          if (isImage) {
            alert('Image uploads are not allowed. Please use an external URL.');
            return true;
          }
        }
        return false;
      },
      handlePaste: (_, event) => {
        if (
          event.clipboardData &&
          event.clipboardData.files &&
          event.clipboardData.files.length > 0
        ) {
          const isImage = Array.from(event.clipboardData.files).some((file) =>
            file.type.startsWith('image/')
          );
          if (isImage) {
            alert('Image uploads are not allowed. Please use an external URL.');
            return true;
          }
        }
        return false;
      },
      handleDOMEvents: {
        click: (_view, event) => {
          if (!event.ctrlKey && !event.metaKey) {
            return false;
          }

          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return false;
          }

          const link = target.closest('a[href]');
          const href = link?.getAttribute('href');

          if (!href || !isSafeLink(href)) {
            return false;
          }

          window.open(href, '_blank', 'noopener,noreferrer');
          event.preventDefault();
          return true;
        },
      },
    },
  });

  const getLinkFormState = (): CommonConditionsEditorLinkFormState => {
    if (!editor) {
      return {
        text: '',
        url: 'https://',
        canRemove: false,
        focusField: 'url',
        isEditingLink: false,
      };
    }

    const selection = getCurrentSelectionRange();
    const hasSelection = selection.from !== selection.to;
    const linkRange = getActiveLinkContext();
    const mixedLinkSelection = hasMixedLinkSelection();
    const linkUrl =
      (linkRange ? editor.getAttributes('link').href : '') || 'https://';

    if (hasSelection && linkRange) {
      return {
        text: getCurrentText(linkRange.from, linkRange.to),
        url: linkUrl,
        canRemove: true,
        focusField: 'text',
        isEditingLink: true,
      };
    }

    if (linkRange) {
      return {
        text: getCurrentText(linkRange.from, linkRange.to),
        url: linkUrl,
        canRemove: true,
        focusField: 'url',
        isEditingLink: true,
      };
    }

    return {
      text:
        hasSelection && !mixedLinkSelection
          ? getCurrentText(selection.from, selection.to)
          : '',
      url: 'https://',
      canRemove: false,
      focusField: hasSelection ? 'text' : 'url',
      isEditingLink: false,
    };
  };

  const applyLink = ({ text, url }: { text: string; url: string }) => {
    if (!editor || !isSafeLink(url)) return false;

    const selection = getCurrentSelectionRange();
    const linkRange =
      selection.from === selection.to ? getActiveLinkContext() : null;
    const targetFrom = linkRange?.from ?? selection.from;
    const targetTo = linkRange?.to ?? selection.to;
    const existingText =
      targetFrom !== targetTo ? getCurrentText(targetFrom, targetTo) : '';
    const nextText = text || existingText || url;
    const linkEnd = targetFrom + nextText.length;

    return editor
      .chain()
      .focus()
      .insertContentAt({ from: targetFrom, to: targetTo }, nextText)
      .setTextSelection({ from: targetFrom, to: linkEnd })
      .setLink({ href: url })
      .setTextSelection(linkEnd)
      .unsetMark('link', { extendEmptyMarkRange: false })
      .run();
  };

  const removeLink = () => {
    if (!editor) return false;

    const selection = getCurrentSelectionRange();
    const linkRange = getActiveLinkContext();
    const targetRange =
      linkRange ??
      (selection.from !== selection.to
        ? { from: selection.from, to: selection.to }
        : null);

    if (!targetRange) return false;

    return editor
      .chain()
      .focus()
      .setTextSelection(targetRange)
      .unsetLink()
      .setTextSelection(targetRange.to)
      .run();
  };

  const insertImage = (url: string) => {
    if (!editor) return;
    if (!isSafeImage(url)) {
      alert('Only http(s):// image URLs are allowed.');
      return;
    }

    editor.chain().focus().setImage({ src: url, alt: 'image' }).run();
  };

  useEffect(() => {
    if (!editor) return;
    const normalizedValue = normalizeImportedConditionMarkdown(value);
    const normalizedEditorMarkdown = normalizeImportedConditionMarkdown(
      editor.getMarkdown()
    );

    if (normalizedEditorMarkdown === normalizedValue) {
      if (lastEmittedMarkdownRef.current === normalizedValue) {
        lastEmittedMarkdownRef.current = null;
      }
      return;
    }

    if (lastEmittedMarkdownRef.current === normalizedValue) {
      lastEmittedMarkdownRef.current = null;
      return;
    }

    editor.commands.setContent(normalizedValue, {
      contentType: 'markdown',
    });
  }, [editor, value]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        setIsModifierKeyPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        setIsModifierKeyPressed(false);
      }
    };

    const resetModifierState = () => {
      setIsModifierKeyPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetModifierState);
    document.addEventListener('visibilitychange', resetModifierState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetModifierState);
      document.removeEventListener('visibilitychange', resetModifierState);
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      insertCondition: (markdown: string) => {
        if (!editor) return false;
        const selection = lastSelectionRef.current ?? editor.state.selection;
        const content = buildConditionContent(markdown);
        if (content.length === 0) {
          return false;
        }

        const didInsert = editor
          .chain()
          .focus()
          .insertContentAt({ from: selection.from, to: selection.to }, content)
          .run();
        return didInsert;
      },
    }),
    [editor]
  );

  return (
    <Box w="100%">
      <FormLabel fontWeight="bold">Condition Details</FormLabel>
      {descriptionText ? (
        <Text id={editorDescriptionId} fontSize="sm" color="gray.600" mb={3}>
          {descriptionText}
        </Text>
      ) : null}
      <CommonConditionsEditorToolbar
        editor={editor}
        getLinkFormState={getLinkFormState}
        onApplyLink={applyLink}
        onRemoveLink={removeLink}
        onInsertImage={insertImage}
      />

      <Box
        className={
          isModifierKeyPressed ? 'modifier-link-open' : 'modifier-link-closed'
        }
        data-testid="common-conditions-editor-shell"
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        minH="220px"
        maxH="420px"
        overflowY="auto"
        p={3}
        opacity={isDisabled ? 0.6 : 1}
        pointerEvents={isDisabled ? 'none' : 'auto'}
        sx={{
          '.ProseMirror': {
            ...commonConditionsProseStyles,
            minHeight: '180px',
            outline: 'none',
            whiteSpace: 'pre-wrap',
          },
          '.ProseMirror a[href]': {
            cursor: 'text',
          },
          '&.modifier-link-open .ProseMirror a[href]': {
            cursor: 'pointer',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
});

CommonConditionsEditor.displayName = 'CommonConditionsEditor';
