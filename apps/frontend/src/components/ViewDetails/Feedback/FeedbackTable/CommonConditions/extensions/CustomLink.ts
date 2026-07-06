import Link from '@tiptap/extension-link';

export const CustomLink = Link.extend({
  // Keep autolink behavior, but make the caret at the link boundary behave like plain text.
  inclusive() {
    return false;
  },
});
