import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

test('Launch Site tab with invalid values', async ({ page }) => {
  // --- Login ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // --- Navigate to form ---
  await page.goto(formUrl);

  // === TAB 0: Launch Site ===
  await page.locator('#mission_name').fill(''); // Empty
  await page.locator('#name_of_licensee').fill(''); // Empty
  await page.locator('#call_sign').fill(''); // Invalid characters
  await page.locator('#name_of_launch_vehicle').fill(''); // Nonsensical name
  await page.locator('#city').fill(''); // Empty
  // Leave the state at its default "Please Select State" option.
  await page.locator('#latitude').fill(''); // Required numeric value omitted
  await page.locator('#longitude').fill('9999'); // Out of valid range

  await page.locator('#launch_datetime_primary').fill(''); // Required date omitted
  await page.locator('#launch_datetime_backup').fill('');
  await page.locator('#orbital_location').fill(''); // Empty orbital location

  // Try to go to the next tab (should trigger validation errors)
  await page.locator('.forward-submit-btn').click();

  await expect(page.getByRole('tab', { name: 'Launch Site' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.locator('#state')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#latitude')).toHaveAttribute(
    'aria-invalid',
    'true'
  );
  await expect(page.locator('#launch_datetime_primary')).toHaveAttribute(
    'aria-invalid',
    'true'
  );
});
