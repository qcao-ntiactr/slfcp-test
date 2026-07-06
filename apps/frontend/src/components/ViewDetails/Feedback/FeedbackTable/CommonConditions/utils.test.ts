import { describe, expect, it } from 'vitest';

import { buildCommonConditionInsertionMarkdown } from './utils';

describe('buildCommonConditionInsertionMarkdown', () => {
  it('adds the title as an H1 heading above body content', () => {
    expect(
      buildCommonConditionInsertionMarkdown({
        title: 'Custom Condition',
        content: 'Condition body.',
      })
    ).toBe('# Custom Condition\n\nCondition body.');
  });

  it('preserves leading headings in user-authored content', () => {
    expect(
      buildCommonConditionInsertionMarkdown({
        title: 'Custom Condition',
        content: '# User Heading\n\nCondition body.',
      })
    ).toBe('# Custom Condition\n\n# User Heading\n\nCondition body.');
  });

  it('returns a clean H1 heading for empty body content', () => {
    expect(
      buildCommonConditionInsertionMarkdown({
        title: 'Custom Condition',
        content: '   ',
      })
    ).toBe('# Custom Condition');
  });

  it('uses seeded H1 markdown formatting, not bold syntax', () => {
    const markdown = buildCommonConditionInsertionMarkdown({
      title: 'Custom Condition',
      content: 'Condition body.',
    });

    expect(markdown).toMatch(/^# Custom Condition/);
    expect(markdown).not.toContain('**Custom Condition**');
  });
});
