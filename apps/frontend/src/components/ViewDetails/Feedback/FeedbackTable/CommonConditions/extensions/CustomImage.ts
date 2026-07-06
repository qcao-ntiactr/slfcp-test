import Image from '@tiptap/extension-image';

export const CustomImage = Image.extend({
  inline() {
    return true;
  },

  group() {
    return 'inline';
  },
}).configure({
  allowBase64: false,
  HTMLAttributes: {
    referrerpolicy: 'no-referrer',
  },
});
