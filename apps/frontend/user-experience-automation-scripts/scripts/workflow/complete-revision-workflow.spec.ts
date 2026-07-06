import path from 'path';

import { test } from '@playwright/test';
import dotenv from 'dotenv';

import {
  getValidFrequencyAndBandwidth,
  fillReceiverField,
} from '../request-form/utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;
const viewRequestsUrl = `${baseUrl}${process.env.VIEW_REQUESTS_URL || '/view-requests'}`;

const getFormattedRequestId = (rawId: string) =>
  `SLFCP-${rawId.toString().padStart(5, '0')}-${new Date().getFullYear()}`;

const openRequestDetails = async (
  page,
  formattedRequestId: string,
  retries = 3
) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`Attempt ${attempt} to find request ${formattedRequestId}`);

    await page.goto(viewRequestsUrl);
    await page.waitForSelector('table');
    await page.waitForTimeout(2000); // Wait for data to load

    let found = false;
    let currentPage = 1;

    while (!found) {
      const row = await page
        .locator('table >> tr', {
          hasText: formattedRequestId,
        })
        .first();

      if (await row.count()) {
        const viewButton = row.locator('a[aria-label^="View details"]');
        await viewButton.scrollIntoViewIfNeeded();
        await viewButton.click();
        return;
      }

      const nextButton = page.getByRole('button', { name: /next/i });
      const isDisabled = await nextButton.getAttribute('disabled');
      if (isDisabled !== null) {
        console.log(
          `Request ${formattedRequestId} not found on page ${currentPage}`
        );
        break; // No more pages
      }

      await nextButton.click();
      await page.waitForTimeout(1000);
      currentPage++;
    }

    if (attempt < retries) {
      console.log(
        `Request not found, waiting 5 seconds before retry ${attempt + 1}...`
      );
      await page.waitForTimeout(5000);
    }
  }

  throw new Error(
    `❌ Request ${formattedRequestId} not found after ${retries} attempts.`
  );
};

const fillCommentAndSubmit = async (
  page,
  comment: string,
  action: 'approve' | 'concur' | 'request_revisions',
  confidential = false,
  requestedChanges?: string
) => {
  await page.waitForSelector('textarea[name="comment"]');
  await page.locator('textarea[name="comment"]').fill(comment);

  if (confidential) {
    await page.locator('[name="is_internal"] + span').click();
  }

  await page.selectOption('select[name="action"]', action);

  // If requesting revisions, fill in the requested changes
  if (action === 'request_revisions' && requestedChanges) {
    await page.waitForSelector('textarea[id="justificationTextVisible"]');
    await page
      .locator('textarea[id="justificationTextVisible"]')
      .fill(requestedChanges);
  }
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForTimeout(3000);
};

const logOut = async (page) => {
  await page.getByRole('button', { name: 'Log Out' }).click();
  await page.waitForTimeout(3000);
};

const submitInitialRequest = async (page) => {
  // --- Login as commercial user ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // --- Navigate to form ---
  await page.goto(formUrl);

  // === TAB 0: Launch Site ===
  await page.locator('#mission_name').fill('Falcon Heavy Demo Mission');
  await page.locator('#name_of_licensee').fill('SpaceX');
  await page.locator('#call_sign').fill('SLI-001');
  await page.locator('#name_of_launch_vehicle').fill('Falcon Heavy');
  await page.locator('#city').fill('Cape Canaveral');
  await page.locator('#state').selectOption({ label: 'Florida' });
  await page.locator('#latitude').fill('28.3922');
  await page.locator('#longitude').fill('80.6077');
  await page.locator('#launch_datetime_primary').fill('2030-07-10T08:30');
  await page.locator('#launch_datetime_backup').fill('2030-07-11T08:30');
  await page.locator('#orbital_location').fill('Geostationary Orbit over 75W');

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
    await justificationInput.fill('High data rate required');
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

  await page.locator('#emission_designator').fill('16K0F3E');
  await page.locator('#nature_of_modulating_signals').fill('Digital');

  // TX
  await page.locator('#tx_transmission_start').first().fill('2030-07-01T08:00');
  await page.locator('#tx_transmission_end').first().fill('2030-07-01T09:00');
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

  // Receiver Section (first receiver in the array)
  await fillReceiverField(page, 0, 'transmission_start', '2030-07-01T08:00');
  await fillReceiverField(page, 0, 'transmission_end', '2030-07-01T09:00');
  await fillReceiverField(page, 0, 'antenna_type', 'Dish Antenna');
  await fillReceiverField(page, 0, 'antenna_gain', gain);
  await fillReceiverField(page, 0, 'antenna_beamwidth', beamwidth);
  await fillReceiverField(
    page,
    0,
    'antenna_altitude',
    (Math.random() * 100).toFixed(2)
  );
  await fillReceiverField(page, 0, 'antenna_altitude_unit', '', {
    click: true,
  });
  await fillReceiverField(
    page,
    0,
    'location_of_receiving_ground_station',
    'First Stage',
    { selectOption: true }
  );
  await fillReceiverField(
    page,
    0,
    'latitude_of_receiving_antenna',
    (Math.random() * 180 - 90).toFixed(4)
  );
  await fillReceiverField(
    page,
    0,
    'longitude_of_receiving_antenna',
    (Math.random() * 360 - 180).toFixed(4)
  );

  await page.getByRole('button', { name: /Add Frequency/i }).click();
  await page.waitForTimeout(400);

  // === TAB 2: Additional Information ===
  await page.getByRole('tab', { name: 'Additional Information' }).click();

  await page
    .locator('#ground_track_from_liftoff_until_payload_separation')
    .fill(
      'Launch will follow equatorial trajectory toward geostationary orbit.'
    );

  await page
    .locator('#ecf_cartesian_vectors_format_file_desc')
    .fill('Format includes X, Y, Z vectors at 1-second intervals.');

  await page.setInputFiles(
    'input[type="file"]#ecf_cartesian_vectors_format_file',
    path.resolve(__dirname, '../request-form/files/testECF1.xls')
  );

  await page
    .locator('#ground_track_of_launch_vehicle_2d_img_file_desc')
    .fill('PNG image showing 2D projection of flight path.');

  await page.setInputFiles(
    'input[type="file"]#ground_track_of_launch_vehicle_2d_img_file',
    path.resolve(__dirname, '../request-form/files/cmis.png')
  );

  await page.locator('#fcc_filing_date').fill('2030-10-01');

  // === TAB 3: Points of Contact ===
  await page.locator('#primary_poc_name').fill('John Doe');
  await page.locator('#primary_poc_email').fill('john.doe@example.com');
  await page.locator('#primary_poc_phone').fill('5551234567');
  await page.locator('#alternate_poc_name').fill('Jane Smith');
  await page.locator('#alternate_poc_email').fill('jane.smith@example.com');
  await page.locator('#alternate_poc_phone').fill('5559876543');

  // === TAB 4: Summary ===
  await page.getByRole('tab', { name: 'Summary' }).click();

  // Submit the request
  await page.getByRole('button', { name: /submit/i }).click();

  // Wait for the success modal to appear
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

  // Extract request ID from the modal text
  const modalText = await page.locator('[role="dialog"]').textContent();
  const requestIdMatch = modalText?.match(/SLFCP-(\d+)-(\d{4})/);
  if (!requestIdMatch) {
    throw new Error(
      `Could not extract request ID from modal. Modal text: ${modalText}`
    );
  }

  const requestId = requestIdMatch[1];
  console.log(
    `✅ Step 1: Commercial user submitted request ${getFormattedRequestId(requestId)}`
  );

  // Close the modal
  await page.getByRole('button', { name: /ok/i }).click();
  await page.waitForTimeout(2000);

  await logOut(page);
  return requestId;
};

const reviseAndResubmitRequest = async (
  page,
  requestId: string,
  stepDescription: string
) => {
  // --- Login as commercial user ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Navigate directly to the revise request page
  const formattedRequestId = getFormattedRequestId(requestId);
  const reviseUrl = `${baseUrl}/revise-request/${requestId}`;

  // Wait a bit for the status to update after NTIA requested revisions
  await page.waitForTimeout(1000);

  await page.goto(reviseUrl);
  await page.waitForTimeout(2000);

  // Make a small change to the request (modify the call sign)
  const currentCallSign = await page.locator('#call_sign').inputValue();
  const newCallSign = currentCallSign.substring(0, 6) + '-R'; // Keep it under 8 characters
  await page.locator('#call_sign').fill(newCallSign);

  // Navigate through all tabs to ensure form validation passes
  await page.locator('.forward-submit-btn').click(); // go to Frequencies tab
  await page.waitForTimeout(1000);

  // Go to Additional Information tab
  await page.getByRole('tab', { name: 'Additional Information' }).click();
  await page.waitForTimeout(1000);

  // Navigate to summary tab (should now be enabled)
  await page.getByRole('tab', { name: 'Summary' }).click();
  await page.getByRole('button', { name: /submit/i }).click();

  // Wait for the success modal to appear and close it
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.getByRole('button', { name: /ok/i }).click();
  await page.waitForTimeout(2000);

  console.log(
    `✅ ${stepDescription}: Commercial user revised and resubmitted request ${formattedRequestId}`
  );
  await logOut(page);
};

test('Complete revision workflow: Submit → NTIA requests revision → Revise → Approve → Concur → NTIA requests revision → Revise → Concur → Approve', async ({
  page,
}) => {
  test.setTimeout(180000); // 3 minutes timeout
  // Step 1: Commercial user submits initial request
  const requestId = await submitInitialRequest(page);
  const formattedRequestId = getFormattedRequestId(requestId);

  // Step 2: NTIA requests revision with "initial changes"
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('ntia@dev.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NTIA requesting initial revisions',
    'request_revisions',
    false,
    'initial changes'
  );
  console.log(
    `✅ Step 2: NTIA requested revision with "initial changes" for request ${formattedRequestId}`
  );
  await logOut(page);

  // Step 3: Commercial user revises and resubmits
  await reviseAndResubmitRequest(page, requestId, 'Step 3');

  // Step 4: NTIA approves
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('ntia@dev.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NTIA initial approval after revision',
    'approve'
  );
  console.log(`✅ Step 4: NTIA approved request ${formattedRequestId}`);
  await logOut(page);

  // Step 5: Navy concurs
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@navy.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'Navy concurs with request', 'concur');
  console.log(`✅ Step 5: Navy concurred with request ${formattedRequestId}`);
  await logOut(page);

  // Step 6: NASA concurs
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@nasa.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'NASA concurs with request', 'concur');
  console.log(`✅ Step 6: NASA concurred with request ${formattedRequestId}`);
  await logOut(page);

  // Step 7: NTIA requests revision with "final changes"
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('ntia@dev.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NTIA requesting final revisions',
    'request_revisions',
    false,
    'final changes'
  );
  console.log(
    `✅ Step 7: NTIA requested revision with "final changes" for request ${formattedRequestId}`
  );
  await logOut(page);

  // Step 8: Commercial user revises and resubmits
  await reviseAndResubmitRequest(page, requestId, 'Step 8');

  // Step 9: Navy concurs
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@navy.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'Navy concurs with final revision',
    'concur'
  );
  console.log(
    `✅ Step 9: Navy concurred with final revision ${formattedRequestId}`
  );
  await logOut(page);

  // Step 10: NASA concurs
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@nasa.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NASA concurs with final revision',
    'concur'
  );
  console.log(
    `✅ Step 10: NASA concurred with final revision ${formattedRequestId}`
  );
  await logOut(page);

  // Step 11: NTIA final approval
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('ntia@dev.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'NTIA final approval', 'approve');
  console.log(
    `✅ Step 11: NTIA gave final approval for request ${formattedRequestId}`
  );

  console.log(
    `🎉 Complete workflow finished successfully for request ${formattedRequestId}`
  );
  await page.pause();
});
