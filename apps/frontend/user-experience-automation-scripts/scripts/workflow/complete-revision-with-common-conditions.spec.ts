import path from 'path';

import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

import {
  fillReceiverField,
  getValidFrequencyAndBandwidth,
} from '../request-form/utils';
import {
  createCommonCondition,
  findCommonConditionRow,
  getUniqueCommonConditionData,
  gotoCommonConditionsLibrary,
  loginAsUser,
  logOut,
  viewRequestsUrl,
} from '../common-conditions/utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

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
    await page.waitForTimeout(2000);

    let currentPage = 1;
    while (true) {
      const row = page
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
        break;
      }

      await nextButton.click();
      await page.waitForTimeout(1000);
      currentPage++;
    }

    console.log(
      `Request ${formattedRequestId} not found on page ${currentPage}, retrying`
    );
    await page.waitForTimeout(3000);
  }

  throw new Error(`Could not find request ${formattedRequestId}`);
};

const verifyRequestStatus = async (
  page,
  formattedRequestId: string,
  statusText: string
) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(viewRequestsUrl);
    await page.waitForSelector('table');
    await page.waitForTimeout(2000);

    while (true) {
      const row = page
        .locator('table >> tr', {
          hasText: formattedRequestId,
        })
        .first();

      if (await row.count()) {
        await expect(row).toContainText(statusText);
        return;
      }

      const nextButton = page.getByRole('button', { name: /next/i });
      const isDisabled = await nextButton.getAttribute('disabled');
      if (isDisabled !== null) {
        break;
      }

      await nextButton.click();
      await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(3000);
  }

  throw new Error(
    `Request ${formattedRequestId} was not found while verifying status`
  );
};

const submitInitialRequest = async (page) => {
  console.log('📝 Commercial user is creating a request');
  await loginAsUser(page, 'commercial');

  await page.goto(formUrl);
  await page.waitForLoadState('networkidle');

  await page
    .locator('#mission_name')
    .fill('Common Conditions Workflow Mission');
  await page.locator('#name_of_licensee').fill('Conditions Test Company');
  await page.locator('#call_sign').fill('COND-001');
  await page.locator('#name_of_launch_vehicle').fill('Condition Rocket');
  await page.locator('#city').fill('Cape Canaveral');
  await page.locator('#state').selectOption({ label: 'Florida' });
  await page.locator('#latitude').fill('28.3922');
  await page.locator('#longitude').fill('80.6077');
  await page.locator('#launch_datetime_primary').fill('2030-07-10T08:30');
  await page.locator('#launch_datetime_backup').fill('2030-07-11T08:30');
  await page.locator('#orbital_location').fill('Geostationary Orbit over 75W');

  await page.locator('.forward-submit-btn').click();

  await page.getByLabel('Number Of Frequencies').fill('1');
  await page.waitForTimeout(200);

  const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();
  const shouldJustify = transmittedBandwidth > 5;

  await page.locator('#frequency').fill(frequency.toString());
  await page
    .locator('#location_of_transmitter_on_vehicle_or_platform')
    .selectOption({ label: 'First Stage' });
  await page.locator('#eirp').fill('45.5');
  await page.getByLabel(/Change the EIRP unit/).click();

  const bandwidthField = page.locator('#transmitted_bandwidth');
  await bandwidthField.fill(transmittedBandwidth.toString());
  await bandwidthField.press('Tab');

  await page
    .locator('#transmitted_bandwidth_is_signal_filtered')
    .getByText('Signal is Filtered')
    .click();

  if (shouldJustify) {
    await page
      .locator('#transmitted_bandwidth_justification')
      .fill('High data rate required');
  }

  await page.locator('#minus_3db_bandwidth').fill('3.20');
  await page
    .locator('#minus_3db_bandwidth_before_or_after_filtering')
    .getByText('After Filtering')
    .click();
  await page.locator('#minus_20db_bandwidth').fill('8.10');
  await page
    .locator('#minus_20db_bandwidth_before_or_after_filtering')
    .getByText('After Filtering')
    .click();
  await page.locator('#minus_60db_bandwidth').fill('15.30');
  await page
    .locator('#minus_60db_bandwidth_before_or_after_filtering')
    .getByText('After Filtering')
    .click();
  await page.locator('#nature_of_modulating_signals').fill('Digital');
  await page.locator('#emission_designator').fill('16K0F3E');

  await page.locator('#tx_transmission_start').first().fill('2030-07-01T08:00');
  await page.locator('#tx_transmission_end').first().fill('2030-07-01T09:00');
  await page.locator('#tx_antenna_type').first().fill('Patch Antenna');
  await page.locator('#tx_antenna_gain').first().fill('12.5');
  await page.locator('#tx_antenna_beamwidth').first().fill('45.0');
  await page.locator('#tx_antenna_altitude').first().fill('100.0');
  await page
    .getByLabel(/Change the altitude unit/)
    .first()
    .click();

  await fillReceiverField(page, 0, 'transmission_start', '2030-07-01T08:00');
  await fillReceiverField(page, 0, 'transmission_end', '2030-07-01T09:00');
  await fillReceiverField(page, 0, 'antenna_type', 'Dish Antenna');
  await fillReceiverField(page, 0, 'antenna_gain', '25.0');
  await fillReceiverField(page, 0, 'antenna_beamwidth', '2.5');
  await fillReceiverField(page, 0, 'antenna_altitude', '50.0');
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
  await fillReceiverField(page, 0, 'latitude_of_receiving_antenna', '28.5000');
  await fillReceiverField(
    page,
    0,
    'longitude_of_receiving_antenna',
    '-80.5000'
  );

  await page.getByRole('button', { name: /Add Frequency/i }).click();
  await page.waitForTimeout(400);

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

  await page.locator('#primary_poc_name').fill('John Doe');
  await page.locator('#primary_poc_email').fill('john.doe@example.com');
  await page.locator('#primary_poc_phone').fill('5551234567');
  await page.locator('#alternate_poc_name').fill('Jane Smith');
  await page.locator('#alternate_poc_email').fill('jane.smith@example.com');
  await page.locator('#alternate_poc_phone').fill('5559876543');

  await page.getByRole('tab', { name: 'Summary' }).click();
  await page.getByRole('button', { name: /submit/i }).click();

  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  const modalText = await page.locator('[role="dialog"]').textContent();
  const requestIdMatch = modalText?.match(/SLFCP-(\d+)-(\d{4})/);
  if (!requestIdMatch) {
    throw new Error(
      `Could not extract request ID from modal. Modal text: ${modalText}`
    );
  }

  const requestId = requestIdMatch[1];
  console.log(
    `✅ Commercial user submitted request ${getFormattedRequestId(requestId)}`
  );

  await page.getByRole('button', { name: /ok/i }).click();
  await page.waitForTimeout(1500);
  await logOut(page);
  return requestId;
};

const addCommonConditionAndSubmit = async (
  page,
  options: {
    action: 'approve_with_conditions' | 'concur_with_conditions';
    comment: string;
    conditionTitle: string;
    conditionContent: string;
  }
) => {
  console.log(
    `🧾 Selecting ${options.action} and adding common condition "${options.conditionTitle}"`
  );
  await page.waitForSelector('textarea[name="comment"]');
  await page.locator('textarea[name="comment"]').fill(options.comment);
  await page.selectOption('select[name="action"]', options.action);

  const addButton = page.getByRole('button', {
    name: `Add ${options.conditionTitle}`,
  });
  await addButton.waitFor({ state: 'visible', timeout: 10000 });
  await addButton.click();

  const hiddenJustification = page.locator('#justificationText');
  await expect(hiddenJustification).toHaveValue(
    new RegExp(options.conditionContent.slice(0, 30))
  );
  await expect(
    page.locator('[data-testid="common-conditions-editor-shell"]')
  ).toContainText(options.conditionContent.slice(0, 30));

  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForTimeout(3000);
};

const fillCommentAndSubmit = async (
  page,
  comment: string,
  action: 'approve' | 'concur'
) => {
  await page.waitForSelector('textarea[name="comment"]');
  await page.locator('textarea[name="comment"]').fill(comment);
  await page.selectOption('select[name="action"]', action);
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForTimeout(3000);
};

test('Complete request workflow with published common conditions', async ({
  page,
}) => {
  test.setTimeout(240000);

  const commonCondition = getUniqueCommonConditionData('Dropdown');

  console.log('\n=== STEP 1: NTIA publishes a common condition ===');
  await loginAsUser(page, 'ntia');
  await gotoCommonConditionsLibrary(page);
  await createCommonCondition(page, {
    title: commonCondition.title,
    content: commonCondition.content,
    action: 'publish',
  });
  const publishedRow = await findCommonConditionRow(
    page,
    commonCondition.title,
    {
      tab: 'Published',
      expectedText: commonCondition.title,
    }
  );
  await expect(publishedRow).toContainText(commonCondition.title);
  await logOut(page);

  console.log('\n=== STEP 2: Commercial user submits a request ===');
  const requestId = await submitInitialRequest(page);
  const formattedRequestId = getFormattedRequestId(requestId);

  console.log(
    '\n=== STEP 3: NTIA selects approve with conditions and adds the published condition ==='
  );
  await loginAsUser(page, 'ntia');
  await openRequestDetails(page, formattedRequestId);
  await addCommonConditionAndSubmit(page, {
    action: 'approve_with_conditions',
    comment: 'NTIA initial approval with common conditions',
    conditionTitle: commonCondition.title,
    conditionContent: commonCondition.content,
  });
  await logOut(page);

  console.log('\n=== STEP 4: Navy concurs ===');
  await loginAsUser(page, 'federal');
  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'Navy concurs with conditions', 'concur');
  await logOut(page);

  console.log('\n=== STEP 5: NASA concurs ===');
  await loginAsUser(page, 'nasa');
  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'NASA concurs with conditions', 'concur');
  await logOut(page);

  console.log(
    '\n=== STEP 6: NTIA finalizes with approve with conditions and verifies final status ==='
  );
  await loginAsUser(page, 'ntia');
  await openRequestDetails(page, formattedRequestId);
  await addCommonConditionAndSubmit(page, {
    action: 'approve_with_conditions',
    comment: 'NTIA final approval with common conditions',
    conditionTitle: commonCondition.title,
    conditionContent: commonCondition.content,
  });

  await verifyRequestStatus(
    page,
    formattedRequestId,
    'REQUEST APPROVED WITH CONDITIONS'
  );
  console.log(
    `✅ Request ${formattedRequestId} finished as REQUEST APPROVED WITH CONDITIONS`
  );
});
