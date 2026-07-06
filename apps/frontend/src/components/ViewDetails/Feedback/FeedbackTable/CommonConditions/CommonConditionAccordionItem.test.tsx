/**
 * @vitest-environment jsdom
 */
import { Accordion, ChakraProvider } from '@chakra-ui/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommonConditionAccordionItem } from './CommonConditionAccordionItem';
import type { CommonCondition } from './types';

afterEach(() => {
  cleanup();
});

const renderItem = (condition: CommonCondition, onAddCondition = vi.fn()) => {
  render(
    <ChakraProvider>
      <Accordion>
        <CommonConditionAccordionItem
          condition={condition}
          onAddCondition={onAddCondition}
        />
      </Accordion>
    </ChakraProvider>
  );

  return onAddCondition;
};

describe('CommonConditionAccordionItem', () => {
  it('adds a condition with the title composed as an H1 heading', () => {
    const onAddCondition = renderItem({
      id: 1,
      title: 'Custom Condition',
      content: 'Condition body.',
      sortOrder: 0,
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Add Custom Condition' })
    );

    expect(onAddCondition).toHaveBeenCalledWith(
      '# Custom Condition\n\nCondition body.'
    );
  });

  it('preserves headings already present in content when adding a condition', () => {
    const onAddCondition = renderItem({
      id: 2,
      title: 'Custom Condition',
      content: '# User Heading\n\nCondition body.',
      sortOrder: 1,
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Add Custom Condition' })
    );

    expect(onAddCondition).toHaveBeenCalledWith(
      '# Custom Condition\n\n# User Heading\n\nCondition body.'
    );
  });

  it('adds a condition without expanding the accordion panel', () => {
    const onAddCondition = renderItem({
      id: 3,
      title: 'Custom Condition',
      content: 'Condition body.',
      sortOrder: 2,
    });
    const titleButton = screen.getByRole('button', {
      name: 'Custom Condition',
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Add Custom Condition' })
    );

    expect(onAddCondition).toHaveBeenCalledTimes(1);
    expect(titleButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands the accordion panel when the title button is clicked', () => {
    renderItem({
      id: 4,
      title: 'Custom Condition',
      content: 'Condition body.',
      sortOrder: 3,
    });
    const titleButton = screen.getByRole('button', {
      name: 'Custom Condition',
    });

    fireEvent.click(titleButton);

    expect(titleButton.getAttribute('aria-expanded')).toBe('true');
  });
});
