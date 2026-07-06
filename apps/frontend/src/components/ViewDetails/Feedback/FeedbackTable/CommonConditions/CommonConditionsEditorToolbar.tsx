import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import { type Editor, useEditorState } from '@tiptap/react';
import {
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
} from '@chakra-ui/react';
import {
  FaBold,
  FaImage,
  FaItalic,
  FaLink,
  FaListOl,
  FaSort,
  FaUnderline,
  FaListUl,
} from 'react-icons/fa';
import { ImClearFormatting } from 'react-icons/im';
import { LuPencilLine } from 'react-icons/lu';
import { FaChevronDown } from 'react-icons/fa6';

import type { CommonConditionsEditorLinkFormState } from './CommonConditionsEditor';
import {
  getMarkerForIndex,
  getOrderedListStyleLabel,
  type OrderedListStyle,
} from './extensions/orderedListUtils';
import { isSafeLink } from './utils';

type CommonConditionsEditorToolbarProps = {
  editor: Editor | null;
  getLinkFormState: () => CommonConditionsEditorLinkFormState;
  onApplyLink: (_values: { text: string; url: string }) => boolean;
  onRemoveLink: () => boolean;
  onInsertImage: (_url: string) => void;
};

const DEFAULT_TOOLBAR_STATE = {
  blockFormatLabel: 'Normal',
  bold: false,
  italic: false,
  underline: false,
  highlight: false,
  link: false,
  orderedList: false,
  orderedListStyle: 'decimal' as OrderedListStyle,
  bulletList: false,
};

export const CommonConditionsEditorToolbar = ({
  editor,
  getLinkFormState,
  onApplyLink,
  onRemoveLink,
  onInsertImage,
}: CommonConditionsEditorToolbarProps) => {
  const getToggleButtonStyles = (isActive: boolean) => ({
    variant: 'outline' as const,
    borderWidth: '1px',
    borderColor: isActive ? 'gray.800' : 'gray.200',
    color: 'gray.800',
    _hover: {
      bg: 'white',
      borderColor: isActive ? 'gray.600' : 'gray.300',
    },
    _active: {
      bg: 'gray.100',
      borderColor: isActive ? 'gray.600' : 'gray.300',
    },
  });

  const initialFocusRef = useRef<HTMLInputElement>(null);
  const linkTextRef = useRef<HTMLInputElement>(null);
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkError, setLinkError] = useState('');
  const [linkFocusField, setLinkFocusField] = useState<'text' | 'url'>('url');
  const [canRemoveLink, setCanRemoveLink] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const toolbarState =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        if (!currentEditor) return DEFAULT_TOOLBAR_STATE;

        let blockFormatLabel = 'Normal';
        if (currentEditor.isActive('heading', { level: 1 })) {
          blockFormatLabel = 'Heading 1';
        } else if (currentEditor.isActive('heading', { level: 2 })) {
          blockFormatLabel = 'Heading 2';
        } else if (currentEditor.isActive('heading', { level: 3 })) {
          blockFormatLabel = 'Heading 3';
        } else if (currentEditor.isActive('blockquote')) {
          blockFormatLabel = 'Block quote';
        }

        return {
          blockFormatLabel,
          bold: currentEditor.isActive('bold'),
          italic: currentEditor.isActive('italic'),
          underline: currentEditor.isActive('underline'),
          highlight: currentEditor.isActive('highlight'),
          link: currentEditor.isActive('link'),
          orderedList: currentEditor.isActive('orderedList'),
          orderedListStyle:
            (currentEditor.getAttributes('orderedList').listStyle as
              | OrderedListStyle
              | undefined) ?? 'decimal',
          bulletList: currentEditor.isActive('bulletList'),
        };
      },
    }) ?? DEFAULT_TOOLBAR_STATE;

  const rememberSelection = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
  };

  const handleToolbarMouseDown = (_event: MouseEvent<HTMLElement>) => {
    rememberSelection();
  };

  const focusEditorAtSavedSelection = () => {
    if (!editor) return null;

    const chain = editor.chain().focus();
    const savedSelection = savedSelectionRef.current;

    if (!savedSelection) {
      return chain;
    }

    return chain.setTextSelection(savedSelection);
  };

  const applyBlockFormat = (
    format: 'normal' | 'heading1' | 'heading2' | 'heading3' | 'blockquote'
  ) => {
    if (!editor) return;

    const chain = focusEditorAtSavedSelection();
    if (!chain) return;

    switch (format) {
      case 'normal':
        chain.setParagraph().run();
        return;
      case 'heading1':
        chain.toggleHeading({ level: 1 }).run();
        return;
      case 'heading2':
        chain.toggleHeading({ level: 2 }).run();
        return;
      case 'heading3':
        chain.toggleHeading({ level: 3 }).run();
        return;
      case 'blockquote':
        chain.toggleBlockquote().run();
        return;
    }
  };

  const handleAddImage = (onClose: () => void) => {
    const nextUrl = imageUrl.trim();
    if (!nextUrl) return;

    onInsertImage(nextUrl);
    setImageUrl('');
    onClose();
  };

  const handleImageInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    onClose: () => void
  ) => {
    if (event.key !== 'Enter' && event.key !== 'NumpadEnter') return;
    event.preventDefault();
    handleAddImage(onClose);
  };

  const initializeLinkForm = () => {
    const nextState = getLinkFormState();
    setLinkText(nextState.text);
    setLinkUrl(nextState.url);
    setCanRemoveLink(nextState.canRemove);
    setLinkFocusField(nextState.focusField);
    setIsEditingLink(nextState.isEditingLink);
    setLinkError('');
  };

  const closeLinkPopover = (onClose: () => void) => {
    onClose();
    setLinkText('');
    setLinkUrl('https://');
    setLinkError('');
    setCanRemoveLink(false);
    setIsEditingLink(false);
    requestAnimationFrame(() => {
      editor?.commands.focus();
    });
  };

  const handleApplyLink = (onClose: () => void) => {
    const nextUrl = linkUrl.trim();
    const nextText = linkText.trim();

    if (!nextUrl) {
      setLinkError('Link URL is required.');
      return;
    }

    if (!isSafeLink(nextUrl)) {
      setLinkError('Only http(s):// or mailto: links are allowed.');
      return;
    }

    const didApply = onApplyLink({ text: nextText, url: nextUrl });
    if (!didApply) return;

    closeLinkPopover(onClose);
  };

  const handleLinkInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    onClose: () => void
  ) => {
    if (event.key !== 'Enter' && event.key !== 'NumpadEnter') return;
    event.preventDefault();
    handleApplyLink(onClose);
  };

  const handleRemoveLink = (onClose: () => void) => {
    const didRemove = onRemoveLink();
    if (!didRemove) return;
    closeLinkPopover(onClose);
  };

  return (
    <Flex
      wrap="wrap"
      gap={2}
      mb={3}
      role="toolbar"
      aria-label="Formatting toolbar"
    >
      <Menu>
        <MenuButton
          as={Button}
          size="md"
          onMouseDown={handleToolbarMouseDown}
          isDisabled={!editor}
          {...getToggleButtonStyles(toolbarState.blockFormatLabel !== 'Normal')}
          rightIcon={<FaSort />}
          aria-label="Text style"
          type="button"
        >
          {toolbarState.blockFormatLabel}
        </MenuButton>
        <MenuList>
          <MenuItem onClick={() => applyBlockFormat('normal')}>Normal</MenuItem>
          <MenuItem onClick={() => applyBlockFormat('heading1')}>
            <Text fontSize="xl" fontWeight="semibold">
              Heading 1
            </Text>
          </MenuItem>
          <MenuItem onClick={() => applyBlockFormat('heading2')}>
            <Text fontSize="lg" fontWeight="semibold">
              Heading 2
            </Text>
          </MenuItem>
          <MenuItem onClick={() => applyBlockFormat('heading3')}>
            <Text fontSize="md" fontWeight="semibold">
              Heading 3
            </Text>
          </MenuItem>
          <MenuItem onClick={() => applyBlockFormat('blockquote')}>
            <Text fontStyle="italic">Block quote</Text>
          </MenuItem>
        </MenuList>
      </Menu>
      <Button
        size="md"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => focusEditorAtSavedSelection()?.toggleBold().run()}
        isDisabled={!editor}
        {...getToggleButtonStyles(toolbarState.bold)}
        aria-label="Bold"
        aria-pressed={toolbarState.bold}
        type="button"
      >
        <FaBold />
      </Button>
      <Button
        size="md"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => focusEditorAtSavedSelection()?.toggleItalic().run()}
        isDisabled={!editor}
        {...getToggleButtonStyles(toolbarState.italic)}
        aria-label="Italic"
        aria-pressed={toolbarState.italic}
        type="button"
      >
        <FaItalic />
      </Button>
      <Button
        size="md"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => focusEditorAtSavedSelection()?.toggleUnderline().run()}
        isDisabled={!editor}
        {...getToggleButtonStyles(toolbarState.underline)}
        aria-label="Underline"
        aria-pressed={toolbarState.underline}
        type="button"
      >
        <FaUnderline />
      </Button>
      <Button
        size="md"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => focusEditorAtSavedSelection()?.toggleHighlight().run()}
        isDisabled={!editor}
        {...getToggleButtonStyles(toolbarState.highlight)}
        aria-label="Highlight"
        aria-pressed={toolbarState.highlight}
        type="button"
      >
        <LuPencilLine />
      </Button>
      <ButtonGroup isAttached size="md">
        <Button
          {...getToggleButtonStyles(toolbarState.orderedList)}
          onMouseDown={handleToolbarMouseDown}
          onClick={() =>
            focusEditorAtSavedSelection()?.toggleOrderedList().run()
          }
          isDisabled={!editor}
          aria-label="Toggle ordered list"
          aria-pressed={toolbarState.orderedList}
          type="button"
          borderRightRadius="none"
        >
          <FaListOl />
        </Button>
        <Menu placement="bottom-start">
          <MenuButton
            as={Button}
            onMouseDown={handleToolbarMouseDown}
            {...getToggleButtonStyles(toolbarState.orderedList)}
            isDisabled={!editor}
            aria-label="Choose ordered list style"
            aria-haspopup="menu"
            borderLeftRadius="none"
            borderLeftWidth="1px"
            minW="unset"
            px={2}
            rightIcon={undefined}
            type="button"
          >
            <FaChevronDown />
          </MenuButton>
          <MenuList>
            <MenuOptionGroup
              title="Ordered list style"
              type="radio"
              value={toolbarState.orderedListStyle}
            >
              {(
                ['decimal', 'lower-alpha', 'upper-alpha'] as OrderedListStyle[]
              ).map((style) => (
                <MenuItemOption
                  key={style}
                  value={style}
                  onClick={() =>
                    focusEditorAtSavedSelection()
                      ?.setOrderedListStyle(style)
                      .run()
                  }
                >
                  {getMarkerForIndex(style, 1, 0)}{' '}
                  {getOrderedListStyleLabel(style)}
                </MenuItemOption>
              ))}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
      </ButtonGroup>
      <Button
        size="md"
        onMouseDown={handleToolbarMouseDown}
        onClick={() => focusEditorAtSavedSelection()?.toggleBulletList().run()}
        isDisabled={!editor}
        {...getToggleButtonStyles(toolbarState.bulletList)}
        aria-label="Unordered list"
        aria-pressed={toolbarState.bulletList}
        type="button"
      >
        <FaListUl />
      </Button>
      <Button
        size="md"
        onMouseDown={handleToolbarMouseDown}
        onClick={() =>
          focusEditorAtSavedSelection()?.unsetAllMarks().clearNodes().run()
        }
        isDisabled={!editor}
        variant="outline"
        aria-label="Clear formatting"
        type="button"
      >
        <ImClearFormatting />
      </Button>
      <Popover
        placement="bottom-start"
        initialFocusRef={
          (linkFocusField === 'text'
            ? linkTextRef
            : linkUrlRef) as RefObject<HTMLInputElement>
        }
        returnFocusOnClose={false}
      >
        {({ onClose }) => (
          <>
            <PopoverTrigger>
              <Button
                size="md"
                onMouseDown={handleToolbarMouseDown}
                onClick={initializeLinkForm}
                isDisabled={!editor}
                {...getToggleButtonStyles(isEditingLink && toolbarState.link)}
                aria-label="Insert or edit link"
                type="button"
              >
                <FaLink />
              </Button>
            </PopoverTrigger>
            <PopoverContent w="320px">
              <PopoverArrow />
              <PopoverBody p={3}>
                <Flex direction="column" gap={3}>
                  <FormControl>
                    <FormLabel htmlFor="link-display-text" fontSize="sm" mb={1}>
                      Display text
                    </FormLabel>
                    <Input
                      id="link-display-text"
                      ref={linkTextRef}
                      placeholder="Display text"
                      value={linkText}
                      onChange={(event) => setLinkText(event.target.value)}
                      onKeyDown={(event) =>
                        handleLinkInputKeyDown(event, onClose)
                      }
                    />
                  </FormControl>
                  <FormControl isInvalid={Boolean(linkError)}>
                    <FormLabel htmlFor="link-url" fontSize="sm" mb={1}>
                      Link URL
                    </FormLabel>
                    <Input
                      id="link-url"
                      ref={linkUrlRef}
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(event) => {
                        setLinkUrl(event.target.value);
                        if (linkError) setLinkError('');
                      }}
                      onKeyDown={(event) =>
                        handleLinkInputKeyDown(event, onClose)
                      }
                      aria-describedby={
                        linkError ? 'link-url-error' : undefined
                      }
                    />
                    <FormErrorMessage id="link-url-error">
                      {linkError}
                    </FormErrorMessage>
                  </FormControl>
                  <Flex justify="space-between" gap={2}>
                    <Button
                      onClick={() => handleApplyLink(onClose)}
                      type="button"
                    >
                      Apply link
                    </Button>
                    {canRemoveLink ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveLink(onClose)}
                        type="button"
                      >
                        Remove link
                      </Button>
                    ) : null}
                  </Flex>
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </>
        )}
      </Popover>
      <Popover
        placement="bottom-start"
        initialFocusRef={initialFocusRef as RefObject<HTMLInputElement>}
      >
        {({ onClose }) => (
          <>
            <PopoverTrigger>
              <Button
                size="md"
                onMouseDown={handleToolbarMouseDown}
                isDisabled={!editor}
                variant="outline"
                aria-label="Insert image by URL"
                type="button"
              >
                <FaImage />
              </Button>
            </PopoverTrigger>
            <PopoverContent w="280px">
              <PopoverArrow />
              <PopoverBody p={3}>
                <Flex align="center" gap={2}>
                  <Input
                    ref={initialFocusRef}
                    placeholder="Image URL"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    onKeyDown={(event) =>
                      handleImageInputKeyDown(event, onClose)
                    }
                    aria-label="Image URL"
                  />
                  <Button
                    onClick={() => handleAddImage(onClose)}
                    isDisabled={!imageUrl.trim()}
                    flexShrink={0}
                    type="button"
                  >
                    Add
                  </Button>
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </>
        )}
      </Popover>
    </Flex>
  );
};
