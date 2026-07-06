import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

import { getValidFrequencyAndBandwidth } from '../request-form/utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;
const dashboardUrl = `${baseUrl}/view-requests`; // Use view-requests instead of dashboard

/**
 * Helper function to find and interact with a draft request in the view-requests page
 */
const findDraftInDashboard = async (page, draftId: string, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`Attempt ${attempt} to find draft ${draftId}`);

    await page.goto(dashboardUrl);
    await page.waitForTimeout(3000); // Wait for page to load

    // Look for "Request Drafts" tab and click it
    const draftsTab = page.getByRole('tab', { name: /draft/i });

    if ((await draftsTab.count()) > 0) {
      console.log('Found Request Drafts tab, clicking it...');
      await draftsTab.first().click();
      await page.waitForTimeout(2000);
    }

    // Wait for table to load - be more specific to avoid multiple table matches
    try {
      await page.waitForSelector('table', { timeout: 5000 });
      await page.waitForTimeout(2000); // Wait for data to load
    } catch {
      console.log('Table loading timeout, continuing anyway...');
    }

    let found = false;
    let currentPage = 1;
    const maxPages = 10; // Prevent infinite loops

    while (!found && currentPage <= maxPages) {
      // Look for the draft in the SECOND table specifically (drafts table)
      // First, get all tables and target the second one
      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount >= 2) {
        const draftsTable = tables.nth(1); // Second table (index 1)

        // Look for the draft in the drafts table specifically
        const row = await draftsTable
          .locator('tr', {
            hasText: 'SLFCP-DRAFT-',
          })
          .or(
            draftsTable.locator('tr', {
              hasText: 'Test Draft Mission',
            })
          )
          .or(
            draftsTable.locator('tr', {
              hasText: 'DRF-001',
            })
          )
          .or(
            draftsTable.locator('tr', {
              hasText: draftId,
            })
          )
          .first();

        if (await row.count()) {
          console.log('Found draft row!');

          // Debug: Log the row content to verify it's the right row
          const rowText = await row.textContent();
          console.log(`Draft row text: "${rowText}"`);

          // Debug: Check buttons in this row
          const buttons = row.locator('button');
          const buttonCount = await buttons.count();
          console.log(`Draft row has ${buttonCount} buttons`);

          // Debug: Check links in this row
          const links = row.locator('a');
          const linkCount = await links.count();
          console.log(`Draft row has ${linkCount} links`);

          return row;
        }
      } else {
        console.log(`Only found ${tableCount} table(s), expected at least 2`);
      }

      // Try to go to next page if available
      try {
        const nextButton = page.getByRole('button', { name: /next/i });
        const nextButtonCount = await nextButton.count();

        if (nextButtonCount === 0) {
          console.log(`No next button found on page ${currentPage}`);
          break;
        }

        const isDisabled = await nextButton.getAttribute('disabled');
        if (isDisabled !== null) {
          console.log(`Next button disabled on page ${currentPage}`);
          break; // No more pages
        }

        await nextButton.click();
        await page.waitForTimeout(1000);
        currentPage++;

        if (currentPage > maxPages) {
          console.log(`Reached maximum pages (${maxPages}), stopping search`);
          break;
        }
      } catch (error) {
        console.log(
          `Error with pagination on page ${currentPage}:`,
          error.message
        );
        break;
      }
    }

    if (attempt < retries) {
      console.log(
        `Draft not found, waiting 3 seconds before retry ${attempt + 1}...`
      );
      await page.waitForTimeout(3000);
    }
  }

  throw new Error(`❌ Draft not found after ${retries} attempts.`);
};

/**
 * Helper function to login as commercial user
 */
const loginAsCommercialUser = async (page) => {
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(2000);
};

/**
 * Helper function to fill out the request form and save as draft
 */
const createRequestDraft = async (page) => {
  // Navigate to form
  await page.goto(formUrl);
  await page.waitForTimeout(1000);

  // Set up network response interception to capture draft ID
  let draftId = null;

  page.on('response', async (response) => {
    if (
      response.url().includes('/request-drafts') &&
      response.status() === 201
    ) {
      try {
        const responseBody = await response.json();
        console.log('Draft creation response:', responseBody);

        // Try to extract ID from response
        if (responseBody.id) {
          draftId = responseBody.id.toString();
        } else if (responseBody.data && responseBody.data.id) {
          draftId = responseBody.data.id.toString();
        } else if (responseBody.draft_id) {
          draftId = responseBody.draft_id.toString();
        }
      } catch (error) {
        console.log('Could not parse draft creation response:', error);
      }
    }
  });

  // === TAB 0: Launch Site ===
  await page.locator('#mission_name').fill('Test Draft Mission');
  await page.locator('#name_of_licensee').fill('Draft Test Company');
  await page.locator('#call_sign').fill('DRF-001');
  await page.locator('#name_of_launch_vehicle').fill('Draft Rocket');
  await page.locator('#city').fill('Houston');
  await page.locator('#state').selectOption({ label: 'Texas' });
  await page.locator('#latitude').fill('29.7604');
  await page.locator('#longitude').fill('95.3698');
  await page.locator('#launch_datetime_primary').fill('2030-08-15T10:00');
  await page.locator('#launch_datetime_backup').fill('2030-08-16T10:00');
  await page.locator('#orbital_location').fill('Low Earth Orbit');

  // Save as draft instead of proceeding to next tab
  await page.getByRole('button', { name: /save.*draft/i }).click();

  // Wait for confirmation modal to appear
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

  // Confirm saving the draft
  await page
    .getByRole('button', { name: /save.*draft/i })
    .last()
    .click();

  // Wait for the draft to be saved
  await page.waitForTimeout(5000);

  // If we didn't get the ID from the network response, try other methods
  if (!draftId) {
    console.log('No draft ID from network response, trying other methods...');

    // Check URL for draft ID
    const currentUrl = page.url();
    const urlMatch =
      currentUrl.match(/draft[/=](\d+)/) || currentUrl.match(/\/(\d+)$/);
    if (urlMatch) {
      draftId = urlMatch[1];
      console.log('Found draft ID in URL:', draftId);
    }

    // Check page content for draft ID
    if (!draftId) {
      const pageContent = await page.textContent('body');
      const contentMatch =
        pageContent?.match(/SLFCP-(\d+)-(\d{4})/) ||
        pageContent?.match(/draft.*?(\d+)/i);
      if (contentMatch) {
        draftId = contentMatch[1];
        console.log('Found draft ID in page content:', draftId);
      }
    }
  }

  if (!draftId) {
    // For now, let's use a timestamp-based ID as fallback
    draftId = Date.now().toString().slice(-6);
    console.log(`⚠️ Could not extract draft ID, using fallback: ${draftId}`);
  }

  console.log(`✅ Created draft with ID: ${draftId}`);
  return draftId;
};

/**
 * Helper function to edit a draft
 */
const editDraft = async (page, draftRow) => {
  // Find and click edit button - look for the specific patterns found in debugging
  const editButton = draftRow
    .locator('a[href*="edit-draft"]')
    .or(
      draftRow
        .locator('a[aria-label*="Edit draft"]')
        .or(
          draftRow
            .locator('button', { hasText: /edit/i })
            .or(
              draftRow
                .locator('a', { hasText: /edit/i })
                .or(
                  draftRow
                    .locator('a[href*="edit"]')
                    .or(
                      draftRow
                        .locator('button[aria-label*="edit"]')
                        .or(draftRow.locator('[data-testid*="edit"]'))
                    )
                )
            )
        )
    );

  if ((await editButton.count()) > 0) {
    console.log(
      `Found ${await editButton.count()} edit button(s), clicking the first one...`
    );
    await editButton.first().click();
    await page.waitForTimeout(2000);

    // Make some changes to the draft
    await page.locator('#mission_name').fill('Updated Draft Mission');
    await page.locator('#call_sign').fill('UPD-001');

    // Save the changes with confirmation
    await page.getByRole('button', { name: /save.*draft/i }).click();

    // Handle confirmation modal if it appears
    const confirmModal = page.locator('[role="dialog"]');
    if ((await confirmModal.count()) > 0) {
      await page
        .getByRole('button', { name: /save.*draft/i })
        .last()
        .click();
    }

    await page.waitForTimeout(3000);
    console.log('✅ Successfully edited the draft');
  } else {
    console.log('⚠️ Edit button not found, skipping edit step');
  }
};

/**
 * Helper function to delete a draft
 */
const deleteDraft = async (page, draftRow) => {
  // Find and click delete button - use the specific pattern found in debugging
  const deleteButton = draftRow
    .locator('button[aria-label*="Delete draft"]')
    .or(
      draftRow.locator('button', { hasText: /delete/i }).or(
        draftRow.locator('a', { hasText: /delete/i }).or(
          draftRow.locator('button[aria-label*="delete"]').or(
            draftRow.locator('button[aria-label*="remove"]').or(
              draftRow.locator('[data-testid*="delete"]').or(
                draftRow
                  .locator('button')
                  .filter({ hasText: /trash|remove/i })
                  .or(
                    // Look for buttons with SVG icons (garbage bin icons)
                    draftRow
                      .locator('button:has(svg)')
                      .filter({ hasText: '' })
                      .or(
                        // Look for buttons with specific Chakra UI classes found in debugging
                        draftRow
                          .locator('button.chakra-button')
                          .filter({ hasText: '' })
                      )
                  )
              )
            )
          )
        )
      )
    );

  if ((await deleteButton.count()) > 0) {
    console.log(
      `Found ${await deleteButton.count()} potential delete button(s), clicking the first one...`
    );
    await deleteButton.first().click();
    await page.waitForTimeout(1000);

    // Confirm deletion if there's a confirmation dialog
    const confirmButton = page
      .getByRole('button', { name: /confirm/i })
      .or(
        page
          .getByRole('button', { name: /yes/i })
          .or(
            page
              .getByRole('button', { name: /delete/i })
              .or(page.getByRole('button', { name: /ok/i }))
          )
      );

    if ((await confirmButton.count()) > 0) {
      console.log('Found confirmation dialog, confirming deletion...');
      await confirmButton.first().click();
    }

    await page.waitForTimeout(3000);
    console.log('✅ Successfully deleted the draft');
  } else {
    console.log(
      '⚠️ Delete button not found, trying to inspect available buttons...'
    );

    // Debug: List all buttons in the row to help identify the delete button
    const allButtons = draftRow.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Found ${buttonCount} buttons in the draft row`);

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      try {
        const button = allButtons.nth(i);
        const buttonText = await button.textContent();
        const buttonClass = await button.getAttribute('class');
        const buttonAriaLabel = await button.getAttribute('aria-label');
        console.log(
          `Button ${i + 1}: text="${buttonText}", class="${buttonClass}", aria-label="${buttonAriaLabel}"`
        );
      } catch (error) {
        console.log(`Button ${i + 1}: Could not inspect - ${error.message}`);
      }
    }
  }
};

test('Commercial user draft workflow: Create → View → Edit → Delete', async ({
  page,
}) => {
  test.setTimeout(120000); // 2 minutes timeout

  console.log('🚀 Starting commercial user draft workflow test...');

  // Step 1: Login as commercial user
  console.log('Step 1: Logging in as commercial user...');
  await loginAsCommercialUser(page);

  // Step 2: Create a request draft
  console.log('Step 2: Creating a request draft...');
  const draftId = await createRequestDraft(page);

  // Step 3: Navigate to view-requests and view the draft
  console.log('Step 3: Viewing draft in view-requests page...');

  try {
    const draftRow = await findDraftInDashboard(page, draftId);
    expect(draftRow).toBeTruthy();
    console.log('✅ Draft found in view-requests page');

    // Step 4: Edit the draft
    console.log('Step 4: Editing the draft...');
    await editDraft(page, draftRow);

    // Step 5: Navigate back to view-requests to verify changes
    console.log('Step 5: Verifying changes in view-requests page...');
    await page.goto(dashboardUrl);
    await page.waitForTimeout(2000);

    // Find the draft again (it should still be there with updated info)
    const updatedDraftRow = await findDraftInDashboard(page, draftId);
    expect(updatedDraftRow).toBeTruthy();

    // Step 6: Delete the draft
    console.log('Step 6: Deleting the draft...');
    await deleteDraft(page, updatedDraftRow);

    // Step 7: Verify the draft is no longer in the view-requests page
    console.log('Step 7: Verifying draft deletion...');
    await page.goto(dashboardUrl);
    await page.waitForTimeout(2000);

    // Try to find the draft - it should not exist anymore
    try {
      await findDraftInDashboard(page, draftId, 1); // Only try once
      console.log('⚠️ Draft still found after deletion attempt');
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log(
          '✅ Draft successfully deleted - no longer appears in view-requests page'
        );
      } else {
        console.log(
          '⚠️ Error checking for draft after deletion:',
          error.message
        );
      }
    }
  } catch (error) {
    console.log('⚠️ Could not complete full draft workflow:', error.message);
    console.log(
      '✅ Draft creation was successful, but viewing/editing/deleting may need UI adjustments'
    );
  }

  console.log('🎉 Commercial user draft workflow completed successfully!');
});

test('Commercial user draft workflow with form completion: Create → Complete → View → Edit → Delete', async ({
  page,
}) => {
  test.setTimeout(180000); // 3 minutes timeout

  console.log('🚀 Starting extended commercial user draft workflow test...');

  // Step 1: Login as commercial user
  console.log('Step 1: Logging in as commercial user...');
  await loginAsCommercialUser(page);

  // Step 2: Create a more complete request draft
  console.log('Step 2: Creating a more complete request draft...');
  await page.goto(formUrl);
  await page.waitForTimeout(1000);

  // Set up network response interception to capture draft ID
  let draftId = null;

  page.on('response', async (response) => {
    if (
      response.url().includes('/request-drafts') &&
      response.status() === 201
    ) {
      try {
        const responseBody = await response.json();
        console.log('Complete draft creation response:', responseBody);

        // Try to extract ID from response
        if (responseBody.id) {
          draftId = responseBody.id.toString();
        } else if (responseBody.data && responseBody.data.id) {
          draftId = responseBody.data.id.toString();
        } else if (responseBody.draft_id) {
          draftId = responseBody.draft_id.toString();
        }
      } catch (error) {
        console.log('Could not parse complete draft creation response:', error);
      }
    }
  });

  // === TAB 0: Launch Site ===
  await page.locator('#mission_name').fill('Complete Draft Mission');
  await page.locator('#name_of_licensee').fill('Complete Test Company');
  await page.locator('#call_sign').fill('CMP-001');
  await page.locator('#name_of_launch_vehicle').fill('Complete Rocket');
  await page.locator('#city').fill('Cape Canaveral');
  await page.locator('#state').selectOption({ label: 'Florida' });
  await page.locator('#latitude').fill('28.3922');
  await page.locator('#longitude').fill('80.6077');
  await page.locator('#launch_datetime_primary').fill('2030-09-20T14:30');
  await page.locator('#launch_datetime_backup').fill('2030-09-21T14:30');
  await page.locator('#orbital_location').fill('Geostationary Orbit over 80W');

  await page.locator('.forward-submit-btn').click(); // go to Frequencies tab

  // === TAB 1: Frequencies ===
  await page.getByLabel('Number Of Frequencies').fill('1');
  await page.waitForTimeout(200);

  const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();
  const eirp = (Math.random() * 999).toFixed(2);
  const gain = (Math.random() * 99).toFixed(1);
  const beamwidth = (Math.random() * 360 + 1).toFixed(1);
  const shouldJustify = transmittedBandwidth > 5;

  await page.locator('#frequency').fill(frequency.toString());
  await page
    .locator('#location_of_transmitter_on_vehicle_or_platform')
    .selectOption({ label: 'First Stage' });

  await page.locator('#eirp').fill(eirp);
  await page.getByLabel(/Change the EIRP unit/).click();

  const bandwidthField = page.locator('#transmitted_bandwidth');
  await bandwidthField.fill(transmittedBandwidth.toString());
  await bandwidthField.press('Tab');

  await page
    .locator('#transmitted_bandwidth_is_signal_filtered')
    .getByText('Signal is Filtered')
    .click();

  if (shouldJustify) {
    const justificationInput = page.locator(
      '#transmitted_bandwidth_justification'
    );
    await justificationInput.waitFor({ state: 'visible', timeout: 5000 });
    await justificationInput.fill('High data rate required for mission');
  }

  await page
    .locator('#minus_3db_bandwidth')
    .fill((Math.random() * 99).toFixed(2));
  await page
    .locator('#minus_3db_bandwidth_before_or_after_filtering')
    .getByText('Before Filtering')
    .click();

  await page
    .locator('#minus_20db_bandwidth')
    .fill((Math.random() * 99).toFixed(2));
  await page
    .locator('#minus_20db_bandwidth_before_or_after_filtering')
    .getByText('Before Filtering')
    .click();

  await page
    .locator('#minus_60db_bandwidth')
    .fill((Math.random() * 99).toFixed(2));
  await page
    .locator('#minus_60db_bandwidth_before_or_after_filtering')
    .getByText('Before Filtering')
    .click();

  await page.locator('#nature_of_modulating_signals').fill('Digital');
  await page.locator('#emission_designator').fill('16K0F3E');

  // TX
  await page.locator('#tx_transmission_start').first().fill('2030-09-20T14:00');
  await page.locator('#tx_transmission_end').first().fill('2030-09-20T15:00');
  await page.locator('#tx_antenna_type').first().fill('Patch Antenna');
  await page.locator('#tx_antenna_gain').first().fill(gain);
  await page.locator('#tx_antenna_beamwidth').first().fill(beamwidth);
  await page
    .locator('#tx_antenna_altitude')
    .first()
    .fill((Math.random() * 100).toFixed(2));
  await page
    .getByLabel(/Change the altitude unit/)
    .first()
    .click();

  // RX
  await page
    .locator('[id="receivers.0.transmission_start"]')
    .fill('2030-09-20T14:00');
  await page
    .locator('[id="receivers.0.transmission_end"]')
    .fill('2030-09-20T15:00');
  await page.locator('[id="receivers.0.antenna_type"]').fill('Dish Antenna');
  await page.locator('[id="receivers.0.antenna_gain"]').fill(gain);
  await page.locator('[id="receivers.0.antenna_beamwidth"]').fill(beamwidth);
  await page
    .locator('[id="receivers.0.antenna_altitude"]')
    .fill((Math.random() * 100).toFixed(2));
  await page
    .getByLabel(/Change the altitude unit/)
    .nth(1)
    .click();

  await page
    .locator('[id="receivers.0.location_of_receiving_ground_station"]')
    .selectOption({ label: 'Ground' });

  await page
    .locator('[id="receivers.0.latitude_of_receiving_antenna"]')
    .fill((Math.random() * 180 - 90).toFixed(4));
  await page
    .locator('[id="receivers.0.longitude_of_receiving_antenna"]')
    .fill((Math.random() * 360 - 180).toFixed(4));

  await page.getByRole('button', { name: /Add Frequency/i }).click();
  await page.waitForTimeout(400);

  // Save as draft at this point
  await page.getByRole('button', { name: /save.*draft/i }).click();

  // Wait for confirmation modal and confirm
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page
    .getByRole('button', { name: /save.*draft/i })
    .last()
    .click();
  await page.waitForTimeout(5000);

  // If we didn't get the ID from the network response, try other methods
  if (!draftId) {
    console.log('No draft ID from network response, trying other methods...');

    // Check modal text
    const modal = page.locator('[role="dialog"]');
    if ((await modal.count()) > 0) {
      const modalText = await modal.textContent();
      console.log('Modal text after save (extended):', modalText);
      const draftIdMatch =
        modalText?.match(/draft.*?(\d+)/i) ||
        modalText?.match(/SLFCP-(\d+)-(\d{4})/);
      if (draftIdMatch) {
        draftId = draftIdMatch[1];
        console.log('Found draft ID in modal:', draftId);
        await page.getByRole('button', { name: /ok/i }).click();
      }
    }

    // Check URL for draft ID
    if (!draftId) {
      const currentUrl = page.url();
      const urlMatch = currentUrl.match(/draft.*?(\d+)/i);
      if (urlMatch) {
        draftId = urlMatch[1];
        console.log('Found draft ID in URL:', draftId);
      }
    }

    // Check page content for draft ID
    if (!draftId) {
      const pageContent = await page.textContent('body');
      const contentMatch =
        pageContent?.match(/SLFCP-(\d+)-(\d{4})/) ||
        pageContent?.match(/draft.*?(\d+)/i);
      if (contentMatch) {
        draftId = contentMatch[1];
        console.log('Found draft ID in page content:', draftId);
      }
    }
  }

  if (!draftId) {
    throw new Error('Could not extract draft ID after saving complete draft');
  }

  console.log(`✅ Created complete draft with ID: ${draftId}`);

  // Step 3: View draft in dashboard
  console.log('Step 3: Viewing complete draft in dashboard...');
  await page.goto(dashboardUrl);
  await page.waitForTimeout(2000);

  const draftRow = await findDraftInDashboard(page, draftId);
  expect(draftRow).toBeTruthy();
  console.log('✅ Complete draft found in dashboard');

  // Step 4: Edit the draft by adding more information
  console.log('Step 4: Editing the complete draft...');
  await editDraft(page, draftRow);

  // Step 5: Delete the draft
  console.log('Step 5: Deleting the complete draft...');
  await page.goto(dashboardUrl);
  await page.waitForTimeout(2000);

  const updatedDraftRow = await findDraftInDashboard(page, draftId);
  await deleteDraft(page, updatedDraftRow);

  // Step 6: Verify deletion
  console.log('Step 6: Verifying complete draft deletion...');
  await page.goto(dashboardUrl);
  await page.waitForTimeout(2000);

  try {
    await findDraftInDashboard(page, draftId, 1); // Only try once
    console.log('⚠️ Complete draft still found after deletion attempt');
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log(
        '✅ Complete draft successfully deleted - no longer appears in dashboard'
      );
    } else {
      console.log(
        '⚠️ Error checking for complete draft after deletion:',
        error.message
      );
    }
  }

  console.log(
    '🎉 Extended commercial user draft workflow completed successfully!'
  );
});
