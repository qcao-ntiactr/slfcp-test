import path from 'path';

import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

import { getValidFrequencyAndBandwidth, fillReceiverField } from './utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

// Read number of frequencies from CLI args or environment variable
const numFrequencies = parseInt(process.env.NUM_FREQ || '1', 10);

test(`Login and add ${numFrequencies} frequency(ies)`, async ({ page }) => {
  // --- Login ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // --- Navigate to form through the application ---
  await page.getByRole('button', { name: 'New Request', exact: true }).click();
  await expect(page).toHaveURL(formUrl);

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

  await page.getByRole('button', { name: 'Frequencies' }).click();

  // === TAB 1: Frequencies ===
  await page
    .getByLabel('Number Of Frequencies')
    .fill(numFrequencies.toString());
  await expect(page.locator('#frequency')).toBeVisible();

  for (let i = 0; i < numFrequencies; i++) {
    const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();

    const eirp = '100';
    const gain = '12.5';
    const beamwidth = '45';
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

    await page.locator('#minus_3db_bandwidth').fill('3');
    await page
      .locator('#minus_3db_bandwidth_before_or_after_filtering')
      .getByText('Before Filtering')
      .click();

    await page.locator('#minus_20db_bandwidth').fill('10');
    await page
      .locator('#minus_20db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();

    await page.locator('#minus_60db_bandwidth').fill('20');
    await page
      .locator('#minus_60db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();

    await page.locator('#nature_of_modulating_signals').fill('Digital');
    await page.locator('#emission_designator').fill('16K0F3E');

    // TX
    await page.locator('#tx_transmission_start').fill('2030-07-01T08:00');
    await page.locator('#tx_transmission_end').fill('2030-07-01T09:00');
    await page.locator('#tx_antenna_type').fill('Patch Antenna');
    await page.locator('#tx_antenna_gain').fill(gain);
    await page.locator('#tx_antenna_beamwidth').fill(beamwidth);
    await page.locator('#tx_antenna_altitude').fill('100');
    await page
      .locator(
        '#tx_antenna_altitude + [aria-label^="Change the altitude unit"]'
      )
      .click();

    // Receiver Section (first receiver in the array)
    await fillReceiverField(page, 0, 'transmission_start', '2030-07-01T08:00');
    await fillReceiverField(page, 0, 'transmission_end', '2030-07-01T09:00');
    await fillReceiverField(page, 0, 'antenna_type', 'Dish Antenna');
    await fillReceiverField(page, 0, 'antenna_gain', gain);
    await fillReceiverField(page, 0, 'antenna_beamwidth', beamwidth);
    await fillReceiverField(page, 0, 'antenna_altitude', '100');
    await fillReceiverField(page, 0, 'antenna_altitude_unit', '', {
      click: true,
    });
    await fillReceiverField(
      page,
      0,
      'location_of_receiving_ground_station',
      'Ground',
      { selectOption: true }
    );
    await fillReceiverField(
      page,
      0,
      'latitude_of_receiving_antenna',
      '10.1234'
    );
    await fillReceiverField(
      page,
      0,
      'longitude_of_receiving_antenna',
      '-70.5678'
    );

    await page.getByRole('button', { name: /Add Frequency/i }).click();
    const frequencyLabel = numFrequencies === 1 ? 'frequency' : 'frequencies';
    await expect(
      page.getByRole('heading', {
        name: `${i + 1} out of ${numFrequencies} ${frequencyLabel} added`,
      })
    ).toBeVisible();
  }

  await page.getByRole('button', { name: 'Edit frequency' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit Frequency' })
  ).toBeVisible();
  await expect(page.locator('#frequency')).toHaveValue('2050');
  await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  await expect(
    page.getByRole('tab', { name: 'Additional Information' })
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save Draft' })).toBeDisabled();

  await page.locator('#frequency').fill('2055');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit Frequency' })
  ).not.toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Additional Information' })
  ).toBeEnabled();

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
    path.join(__dirname, 'files', 'testECF1.xls')
  );

  await page
    .locator('#ground_track_of_launch_vehicle_2d_img_file_desc')
    .fill('PNG image showing 2D projection of flight path.');

  await page.setInputFiles(
    'input[type="file"]#ground_track_of_launch_vehicle_2d_img_file',
    path.join(__dirname, 'files', 'cmis.png')
  );

  await page.locator('#fcc_filing_date').fill('2030-10-01');

  // === TAB 3: Points of Contact ===
  await page
    .locator('#primary_poc_name')
    .fill('Johnathan Bartholomew-Middleton the Third');
  await page
    .locator('#primary_poc_email')
    .fill('johnathan.b.middleton.the.third@example.com');
  await page.locator('#primary_poc_phone').fill('5551234567');
  await page
    .locator('#alternate_poc_name')
    .fill('Jane Elizabeth Alexandra de Saint-Exupéry');
  await page
    .locator('#alternate_poc_email')
    .fill('jane.e.alexandra.desaintexupery@example.com');
  await page.locator('#alternate_poc_phone').fill('5559876543');

  // === TAB 4: Summary ===
  await page.getByRole('tab', { name: 'Summary' }).click();

  await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByLabel('Mission Name', { exact: true })).toHaveValue(
    'Falcon Heavy Demo Mission'
  );
  await expect(
    page.getByRole('cell', { name: '2055', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();

  let submittedBody = '';
  await page.route('**/requests', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    submittedBody = route.request().postData() ?? '';
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ request: { id: 123 } }),
    });
  });

  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(
    page.getByRole('dialog', { name: 'Request Submitted' })
  ).toBeVisible();
  expect(submittedBody).toContain('name="mission_name"');
  expect(submittedBody).toContain('Falcon Heavy Demo Mission');
  expect(submittedBody).toContain('name="frequencies"');
  expect(submittedBody).toContain('"frequency":2055');
});
