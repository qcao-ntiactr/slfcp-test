import { expect, Page } from '@playwright/test';

export const getValidFrequencyAndBandwidth = () => {
  return {
    frequency: 2050,
    transmittedBandwidth: 6,
  };
};

/**
 * Fills a receiver field through its canonical form ID. A missing or
 * inaccessible field is a regression and must fail the test.
 */
export const fillReceiverField = async (
  page: Page,
  receiverIndex: number,
  fieldName: string,
  value: string,
  options?: { selectOption?: boolean; click?: boolean }
) => {
  const { selectOption = false, click = false } = options || {};
  const element = page.locator(`#receivers\\.${receiverIndex}\\.${fieldName}`);
  await expect(element).toBeVisible();

  if (click) {
    await element.click();
  } else if (selectOption) {
    await element.selectOption({ label: value });
  } else {
    await element.fill(value);
  }
};
