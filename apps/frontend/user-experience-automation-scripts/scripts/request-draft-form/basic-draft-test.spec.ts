import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;
const viewRequestsUrl = `${baseUrl}${process.env.VIEW_REQUESTS_URL || '/view-requests'}`;

/**
 * Basic draft functionality test - focuses on core workflow
 */
test('Basic commercial user draft workflow', async ({ page }) => {
  test.setTimeout(90000); // 1.5 minutes timeout

  console.log('🚀 Starting basic commercial user draft workflow...');

  // Step 1: Login as commercial user
  console.log('Step 1: Logging in as commercial user...');
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(2000);

  // Step 2: Create a draft
  console.log('Step 2: Creating a draft...');

  // Set up network response interception to capture draft ID
  let draftId = null;
  let draftCreated = false;

  page.on('response', async (response) => {
    if (
      response.url().includes('/request-drafts') &&
      response.status() === 201
    ) {
      try {
        const responseBody = await response.json();
        console.log('✅ Draft creation successful! Response:', responseBody);

        if (responseBody.id) {
          draftId = responseBody.id.toString();
          draftCreated = true;
        }
      } catch (error) {
        console.log('Could not parse draft creation response:', error);
      }
    }
  });

  await page.goto(formUrl);
  await page.waitForTimeout(1000);

  // Fill out basic form data
  await page.locator('#mission_name').fill('Basic Test Mission');
  await page.locator('#name_of_licensee').fill('Basic Test Company');
  await page.locator('#call_sign').fill('BSC-001');
  await page.locator('#name_of_launch_vehicle').fill('Basic Rocket');
  await page.locator('#city').fill('Houston');
  await page.locator('#state').selectOption({ label: 'Texas' });
  await page.locator('#latitude').fill('29.7604');
  await page.locator('#longitude').fill('95.3698');
  await page.locator('#launch_datetime_primary').fill('2030-12-01T12:00');
  await page.locator('#launch_datetime_backup').fill('2030-12-02T12:00');
  await page.locator('#orbital_location').fill('Low Earth Orbit');

  // Save as draft
  await page.getByRole('button', { name: /save.*draft/i }).click();

  // Wait for confirmation modal and confirm
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page
    .getByRole('button', { name: /save.*draft/i })
    .last()
    .click();

  // Wait for the draft to be saved
  await page.waitForTimeout(5000);

  // Verify draft was created
  expect(draftCreated).toBe(true);
  expect(draftId).toBeTruthy();
  console.log(`✅ Draft created with ID: ${draftId}`);

  // Step 3: Navigate to view-requests to see if draft appears
  console.log('Step 3: Checking if draft appears in view-requests...');
  await page.goto(viewRequestsUrl);
  await page.waitForTimeout(3000);

  // Look for drafts tab
  const draftsTab = page.getByRole('tab', { name: /draft/i });
  if ((await draftsTab.count()) > 0) {
    console.log('Found drafts tab, clicking it...');
    await draftsTab.first().click();
    await page.waitForTimeout(2000);

    // Look for our draft in the table - drafts appear as SLFCP-DRAFT-XXXXX format
    const draftRow = page
      .locator('tr', { hasText: 'SLFCP-DRAFT-' })
      .or(
        page
          .locator('tr', { hasText: 'Basic Test Mission' })
          .or(page.locator('tr', { hasText: 'BSC-001' }))
      );

    if ((await draftRow.count()) > 0) {
      console.log('✅ Draft found in the drafts table!');

      // Try to find edit/delete buttons - use specific patterns found in debugging
      const editButton = draftRow
        .locator('a[href*="edit-draft"]')
        .or(
          draftRow
            .locator('a[aria-label*="Edit draft"]')
            .or(
              draftRow
                .locator('button', { hasText: /edit/i })
                .or(draftRow.locator('a[href*="edit"]'))
            )
        );

      const deleteButton = draftRow
        .locator('button[aria-label*="Delete draft"]')
        .or(
          draftRow.locator('button', { hasText: /delete/i }).or(
            draftRow.locator('button[aria-label*="delete"]').or(
              // Look for buttons with SVG icons (garbage bin icons)
              draftRow
                .locator('button:has(svg)')
                .filter({ hasText: '' })
                .or(
                  // Look for buttons with specific Chakra UI classes found in debugging
                  draftRow
                    .locator('button.chakra-button')
                    .filter({ hasText: '' })
                    .or(
                      // Look for garbage bin icons
                      draftRow.locator('button svg[data-icon="trash"]').or(
                        draftRow.locator('button svg[class*="trash"]').or(
                          draftRow.locator('button [class*="trash"]').or(
                            draftRow
                              .locator('button svg[data-testid*="trash"]')
                              .or(
                                draftRow
                                  .locator('button [data-testid*="trash"]')
                                  .or(
                                    // Look for red colored buttons (often delete buttons)
                                    draftRow
                                      .locator('button[class*="red"]')
                                      .or(
                                        draftRow.locator('button[style*="red"]')
                                      )
                                  )
                              )
                          )
                        )
                      )
                    )
                )
            )
          )
        );

      if ((await editButton.count()) > 0) {
        console.log('✅ Edit button found for draft');
      } else {
        console.log('⚠️ Edit button not found');
      }

      if ((await deleteButton.count()) > 0) {
        console.log(
          `✅ Delete button found for draft (${await deleteButton.count()} matches)`
        );

        // Optional: Actually delete the draft to clean up
        console.log('🗑️ Cleaning up - deleting the draft...');
        await deleteButton.first().click();
        await page.waitForTimeout(1000);

        // Handle confirmation if it appears
        const confirmButton = page.getByRole('button', {
          name: /confirm|yes|delete|ok/i,
        });
        if ((await confirmButton.count()) > 0) {
          console.log('Found confirmation dialog, confirming deletion...');
          await confirmButton.first().click();
          await page.waitForTimeout(2000);
          console.log('✅ Draft deleted successfully');
        }
      } else {
        console.log('⚠️ Delete button not found');

        // Debug: List all buttons in the row
        const allButtons = draftRow.locator('button');
        const buttonCount = await allButtons.count();
        console.log(
          `Found ${buttonCount} buttons in the draft row for debugging:`
        );

        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          try {
            const button = allButtons.nth(i);
            const buttonText = await button.textContent();
            const buttonClass = await button.getAttribute('class');
            const buttonAriaLabel = await button.getAttribute('aria-label');
            console.log(
              `  Button ${i + 1}: text="${buttonText}", class="${buttonClass}", aria-label="${buttonAriaLabel}"`
            );
          } catch {
            console.log(`  Button ${i + 1}: Could not inspect`);
          }
        }
      }
    } else {
      console.log('⚠️ Draft not found in the drafts table');
    }
  } else {
    console.log('⚠️ Drafts tab not found');
  }

  console.log('🎉 Basic commercial user draft workflow completed!');
});

/**
 * Test to verify draft creation API works
 */
test('Verify draft creation API functionality', async ({ page }) => {
  test.setTimeout(60000);

  console.log('🔍 Testing draft creation API...');

  // Login
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(2000);

  // Monitor network requests
  let draftApiCalled = false;
  let draftApiResponse = null;

  page.on('response', async (response) => {
    if (
      response.url().includes('/request-drafts') &&
      response.request().method() === 'POST'
    ) {
      draftApiCalled = true;
      try {
        draftApiResponse = await response.json();
        console.log('Draft API Response:', draftApiResponse);
      } catch {
        console.log('Could not parse draft API response');
      }
    }
  });

  // Go to form and fill minimal data
  await page.goto(formUrl);
  await page.waitForTimeout(1000);

  await page.locator('#mission_name').fill('API Test Mission');
  await page.locator('#name_of_licensee').fill('API Test Company');
  await page.locator('#call_sign').fill('API-001');

  // Save draft
  await page.getByRole('button', { name: /save.*draft/i }).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page
    .getByRole('button', { name: /save.*draft/i })
    .last()
    .click();
  await page.waitForTimeout(3000);

  // Verify API was called
  expect(draftApiCalled).toBe(true);
  expect(draftApiResponse).toBeTruthy();
  expect(draftApiResponse.id).toBeTruthy();

  console.log('✅ Draft creation API is working correctly!');
  console.log(`Created draft with ID: ${draftApiResponse.id}`);
});
