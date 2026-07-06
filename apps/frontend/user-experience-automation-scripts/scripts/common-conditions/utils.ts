import { expect, Locator, Page } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
export const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
export const commonConditionsUrl = `${baseUrl}/common-conditions`;
export const viewRequestsUrl = `${baseUrl}${process.env.VIEW_REQUESTS_URL || '/view-requests'}`;
export const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

type UserType = 'commercial' | 'ntia' | 'federal' | 'nasa';
type CommonConditionTab = 'Published' | 'Submissions';

const credentials = {
  commercial: { email: 'commercial@qa.com', password: 'password123' },
  ntia: { email: 'ntia@dev.com', password: 'password123' },
  federal: { email: 'federal@navy.gov', password: 'password123' },
  nasa: { email: 'federal@nasa.gov', password: 'password123' },
};

export const getUniqueCommonConditionData = (suffix: string) => {
  const timestamp = Date.now();
  const title = `CC QA ${suffix} ${timestamp}`;
  const content = `Condition content for ${suffix} ${timestamp}. This condition verifies the common conditions automation workflow.`;
  return { title, content };
};

export const loginAsUser = async (page: Page, userType: UserType) => {
  const creds = credentials[userType];
  console.log(`🔐 Logging in as ${userType} user (${creds.email})`);

  await page.goto(loginUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.getByLabel('Email Address').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch (_error) {
    await page
      .waitForSelector('[role="main"]', { timeout: 5000 })
      .catch(() => page.waitForLoadState('domcontentloaded'));
  }

  console.log(`✅ Logged in as ${userType}`);
};

export const logOut = async (page: Page) => {
  try {
    await page.getByRole('button', { name: 'Log Out' }).click();
  } catch (_error) {
    console.warn('Log out button not found or user already logged out');
    return;
  }

  try {
    await page.waitForURL(/login|signin|^[^/]*$/, { timeout: 10000 });
  } catch (_error) {
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(() => page.waitForTimeout(1000));
  }

  await page.waitForTimeout(500);
  console.log('✅ Logged out successfully');
};

export const gotoCommonConditionsLibrary = async (page: Page) => {
  console.log('📚 Opening Common Conditions Library');
  await page.goto(commonConditionsUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
  await activeCommonConditionsTable(page).waitFor({
    state: 'visible',
    timeout: 10000,
  });
  await page.waitForTimeout(1000);
};

export const selectCommonConditionsTab = async (
  page: Page,
  tabName: CommonConditionTab
) => {
  console.log(`🗂️ Selecting ${tabName} tab`);
  const tab = page.getByRole('tab', { name: tabName });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await activeCommonConditionsTable(page).waitFor({
    state: 'visible',
    timeout: 10000,
  });
  await page.waitForTimeout(750);
};

const activeTabPanel = (page: Page) =>
  page.locator('[role="tabpanel"]:visible').first();

const activeCommonConditionsTable = (page: Page) =>
  activeTabPanel(page).locator('table').first();

const tableRowForTitle = (page: Page, title: string) =>
  activeCommonConditionsTable(page)
    .locator('tbody tr', { hasText: title })
    .first();

const nextPaginationButton = (page: Page) =>
  activeTabPanel(page).getByRole('button', { name: /next/i });

export const findCommonConditionRow = async (
  page: Page,
  title: string,
  options?: {
    tab?: CommonConditionTab;
    expectedText?: string;
    retries?: number;
  }
) => {
  const { tab = 'Submissions', expectedText, retries = 3 } = options || {};

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(
      `🔍 Looking for common condition "${title}" in ${tab} (attempt ${attempt})`
    );

    await gotoCommonConditionsLibrary(page);
    await selectCommonConditionsTab(page, tab);

    let currentPage = 1;
    while (true) {
      const row = tableRowForTitle(page, title);
      if (await row.count()) {
        if (
          !expectedText ||
          (await row.textContent())?.includes(expectedText)
        ) {
          console.log(
            `✅ Found "${title}" in ${tab} on page ${currentPage}${
              expectedText ? ` with text "${expectedText}"` : ''
            }`
          );
          return row;
        }
      }

      const nextButton = nextPaginationButton(page);
      const isDisabled = await nextButton.getAttribute('disabled');
      if (isDisabled !== null) {
        break;
      }

      await nextButton.click();
      await page.waitForTimeout(750);
      currentPage++;
    }

    if (attempt < retries) {
      await page.waitForTimeout(2000);
    }
  }

  throw new Error(
    `Could not find common condition "${title}" in ${tab}${
      expectedText ? ` with expected text "${expectedText}"` : ''
    }`
  );
};

export const isCommonConditionAbsent = async (
  page: Page,
  title: string,
  tab: CommonConditionTab
) => {
  await gotoCommonConditionsLibrary(page);
  await selectCommonConditionsTab(page, tab);

  while (true) {
    if (await tableRowForTitle(page, title).count()) {
      return false;
    }

    const nextButton = nextPaginationButton(page);
    const isDisabled = await nextButton.getAttribute('disabled');
    if (isDisabled !== null) {
      return true;
    }

    await nextButton.click();
    await page.waitForTimeout(750);
  }
};

export const waitForToast = async (page: Page, text: RegExp | string) => {
  const toast = page.locator('[role="alert"]').filter({ hasText: text });
  await toast.first().waitFor({ state: 'visible', timeout: 10000 });
};

const waitForDialogToClose = async (page: Page) => {
  try {
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
  } catch (_error) {
    await page.waitForTimeout(1000);
  }
};

const waitForCommonConditionMutation = async (
  page: Page,
  action: () => Promise<void>,
  matcher: (_url: string, _status: number) => boolean
) => {
  const responsePromise = page.waitForResponse(
    (response) => matcher(response.url(), response.status()),
    { timeout: 15000 }
  );

  await action();
  const response = await responsePromise;
  return response;
};

export const createCommonCondition = async (
  page: Page,
  values: {
    title: string;
    content: string;
    action: 'save_draft' | 'submit' | 'publish';
  }
) => {
  console.log(`📝 Creating common condition "${values.title}"`);
  await page.getByRole('button', { name: 'Add new common condition' }).click();

  await page.locator('#common-condition-title').fill(values.title);
  const editor = page.locator('[aria-label="Condition details editor"]');
  await editor.click();
  await editor.fill(values.content);

  if (values.action === 'save_draft') {
    await waitForCommonConditionMutation(
      page,
      () => page.getByRole('button', { name: 'Save Draft' }).click(),
      (url, status) =>
        url.includes('/common-conditions/drafts') && status === 201
    );
  } else if (values.action === 'submit') {
    const createDraftResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/common-conditions/drafts') &&
        response.status() === 201,
      { timeout: 15000 }
    );
    const submitResponse = page.waitForResponse(
      (response) =>
        /\/common-conditions\/\d+\/submit$/.test(response.url()) &&
        response.status() === 200,
      { timeout: 15000 }
    );

    await page.getByRole('button', { name: 'Submit' }).click();
    await createDraftResponse;
    await submitResponse;
  } else {
    await waitForCommonConditionMutation(
      page,
      () => page.getByRole('button', { name: 'Publish' }).click(),
      (url, status) =>
        url.includes('/common-conditions/drafts') && status === 201
    );
  }

  await waitForDialogToClose(page);
  await page.waitForTimeout(1000);
  console.log(`✅ Created common condition "${values.title}"`);
};

export const openActionsMenu = async (row: Locator, title: string) => {
  const button = row.getByRole('button', {
    name: new RegExp(`Open actions for common condition ${title}`),
  });
  await button.scrollIntoViewIfNeeded();
  await button.click();
};

export const submitCommonConditionForReview = async (
  page: Page,
  row: Locator,
  title: string
) => {
  console.log(`📤 Submitting "${title}" for review`);
  await openActionsMenu(row, title);
  await page.getByRole('menuitem', { name: /Submit for Review/i }).click();
  await waitForCommonConditionMutation(
    page,
    () => page.getByRole('button', { name: /^Submit$/i }).click(),
    (url, status) =>
      /\/common-conditions\/\d+\/submit$/.test(url) && status === 200
  );
  await waitForDialogToClose(page);
  await page.waitForTimeout(1000);
};

export const approveCommonCondition = async (
  page: Page,
  row: Locator,
  title: string
) => {
  console.log(`✅ Approving common condition "${title}"`);
  await openActionsMenu(row, title);
  await page.getByRole('menuitem', { name: /^Approve$/i }).click();
  await waitForCommonConditionMutation(
    page,
    () => page.getByRole('button', { name: /^Approve$/i }).click(),
    (url, status) =>
      /\/common-conditions\/\d+\/publish$/.test(url) && status === 200
  );
  await waitForDialogToClose(page);
  await page.waitForTimeout(1000);
};

export const denyCommonCondition = async (
  page: Page,
  row: Locator,
  title: string,
  rejectionReason: string
) => {
  console.log(`⛔ Denying common condition "${title}"`);
  await openActionsMenu(row, title);
  await page.getByRole('menuitem', { name: /^Deny$/i }).click();
  await page
    .locator('#common-condition-rejection-reason')
    .fill(rejectionReason);
  await waitForCommonConditionMutation(
    page,
    () => page.getByRole('button', { name: /^Deny$/i }).click(),
    (url, status) =>
      /\/common-conditions\/\d+\/reject$/.test(url) && status === 200
  );
  await waitForDialogToClose(page);
  await page.waitForTimeout(1000);
};

export const openCommonConditionViewModal = async (
  page: Page,
  row: Locator,
  title: string
) => {
  console.log(`👁️ Opening view modal for "${title}"`);
  await openActionsMenu(row, title);
  await page.getByRole('menuitem', { name: /^View$/i }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10000 });
};

export const closeOpenDialog = async (page: Page) => {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  await dialog.locator('button:has-text("Close")').click();
  await dialog
    .waitFor({ state: 'hidden', timeout: 10000 })
    .catch(() => page.waitForTimeout(500));
};

export const expectMenuOptions = async (
  page: Page,
  row: Locator,
  title: string,
  options: string[]
) => {
  await openActionsMenu(row, title);
  for (const option of options) {
    await expect(
      page.getByRole('menuitem', { name: new RegExp(`^${option}$`, 'i') })
    ).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
};
