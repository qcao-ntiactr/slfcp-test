export const surfaceRules = [
  {
    id: 'route-or-page',
    label: 'Route or page surface',
    criteria: ['2.4.1', '2.4.2', '2.4.5', '2.4.6', '3.1.1'],
    test: ({ filePath, text }) => /(?:pages?|routes?)/i.test(filePath) || /<Route\b|createBrowserRouter|path=["'`/]/.test(text),
    recommendation: 'Confirm this route/page is covered by WCAG_PLAYWRIGHT_ROUTES and has title, heading, landmark, and navigation assertions.',
  },
  {
    id: 'form-control',
    label: 'Form or input surface',
    criteria: ['1.3.1', '1.3.5', '3.3.1', '3.3.2', '3.3.3', '4.1.2'],
    test: ({ filePath, text }) => /form|field|input|select|textarea|checkbox|radio/i.test(filePath) || /<(form|input|select|textarea)\b|useForm|FormControl|FormLabel|aria-invalid|required/.test(text),
    recommendation: 'Add or update workflow coverage for labels, autocomplete, validation errors, suggestions, and accessible names.',
  },
  {
    id: 'modal-or-overlay',
    label: 'Modal, popover, menu, or overlay',
    criteria: ['1.4.13', '2.1.1', '2.1.2', '2.4.3', '2.4.7', '4.1.2'],
    test: ({ filePath, text }) => /modal|dialog|popover|menu|drawer|tooltip/i.test(filePath) || /Modal|Dialog|Popover|Menu|Drawer|Tooltip|role=["']dialog/.test(text),
    recommendation: 'Exercise open/close, Escape, focus trap, return focus, hover/focus persistence, and keyboard navigation.',
  },
  {
    id: 'table-or-grid',
    label: 'Table, grid, or data listing',
    criteria: ['1.3.1', '1.3.2', '2.4.6', '4.1.2'],
    test: ({ filePath, text }) => /table|grid|columns|rows/i.test(filePath) || /<(table|thead|tbody|th|td)\b|role=["'](?:table|grid|row|cell)/.test(text),
    recommendation: 'Verify headers, row/column relationships, sort/filter controls, focus order, and screen-reader names.',
  },
  {
    id: 'chart-or-svg',
    label: 'Chart, SVG, image, or icon surface',
    criteria: ['1.1.1', '1.4.1', '1.4.11'],
    test: ({ filePath, text }) => /chart|graph|svg|image|icon|logo/i.test(filePath) || /<(svg|img)\b|ResponsiveContainer|BarChart|LineChart|PieChart|Icon/.test(text),
    recommendation: 'Verify text alternatives, non-color equivalents, accessible chart names/descriptions, and contrast.',
  },
  {
    id: 'keyboard-handler',
    label: 'Keyboard, click, drag, or pointer interaction',
    criteria: ['2.1.1', '2.1.2', '2.1.4', '2.4.3', '2.4.7', '2.5.1', '2.5.2', '2.5.7', '2.5.8'],
    test: ({ text }) => /onClick|onKeyDown|onKeyUp|tabIndex|draggable|onDrag|onPointer|onMouseDown|onTouch/.test(text),
    recommendation: 'Run keyboard-only checks and confirm pointer gestures have keyboard/click alternatives and adequate target size.',
  },
  {
    id: 'status-or-feedback',
    label: 'Status, alert, toast, or async feedback',
    criteria: ['1.4.1', '3.3.1', '3.3.3', '4.1.3'],
    test: ({ filePath, text }) => /status|alert|toast|feedback|error|success|warning/i.test(filePath) || /aria-live|role=["'](?:status|alert)|toast|Alert|Spinner|isLoading/.test(text),
    recommendation: 'Verify status messages are programmatic, not color-only, and do not require focus to be discovered.',
  },
  {
    id: 'rich-text-or-upload',
    label: 'Rich text editor or file upload',
    criteria: ['1.1.1', '1.3.1', '2.1.1', '2.4.6', '3.3.2', '4.1.2'],
    test: ({ filePath, text }) => /rich.?text|editor|upload|file/i.test(filePath) || /contentEditable|FileUpload|type=["']file|dropzone|editor/i.test(text),
    recommendation: 'Add workflow coverage for keyboard access, inserted media alternatives, upload errors, labels, and instructions.',
  },
  {
    id: 'style-or-responsive',
    label: 'Style, layout, contrast, or responsive behavior',
    criteria: ['1.4.3', '1.4.4', '1.4.10', '1.4.11', '1.4.12'],
    test: ({ filePath, text }) => /\.(css|scss|sass)$/.test(filePath) || /color=|bg=|fontSize|lineHeight|overflow|position=["']fixed|@media|breakpoint|theme/.test(text),
    recommendation: 'Run contrast, zoom, reflow, text spacing, and focus indicator checks on affected screens.',
  },
  {
    id: 'help-or-contact',
    label: 'Help, support, or contact path',
    criteria: ['3.2.6'],
    test: ({ filePath, text }) =>
      /(?:^|\/)(?:help|support|contact)(?:page)?\.(?:tsx?|jsx?)$/i.test(filePath) ||
      /\b(?:to|href)\s*=\s*["'`](?:\/help|mailto:|[^"'`]*(?:support|contact)[^"'`]*)["'`]/i.test(text) ||
      /\b(?:support|contact)[\w.-]*@[\w.-]+\.\w+\b/i.test(text),
    recommendation: 'Confirm consistent help/contact placement and target size across the affected routes.',
  },
];
