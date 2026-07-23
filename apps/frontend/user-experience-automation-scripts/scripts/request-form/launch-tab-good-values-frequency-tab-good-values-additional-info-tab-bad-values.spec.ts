import path from 'path';

import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

import { getValidFrequencyAndBandwidth, fillReceiverField } from './utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

const numFrequencies = parseInt(process.env.NUM_FREQ || '1', 10);

const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();

test(`Login and fill good launch/frequencies but bad additional info`, async ({
  page,
}) => {
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
  await page.locator('#launch_datetime_primary').fill('2027-07-10T08:30');
  await page.locator('#launch_datetime_backup').fill('2027-07-11T08:30');
  await page.locator('#orbital_location').fill('Geostationary Orbit over 75W');
  await page.getByRole('button', { name: 'Frequencies' }).click();

  // === TAB 1: Frequencies (Valid Values) ===
  await page
    .getByLabel('Number Of Frequencies')
    .fill(numFrequencies.toString());
  await expect(page.locator('#frequency')).toBeVisible();

  for (let i = 0; i < numFrequencies; i++) {
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
    await page
      .locator('#transmitted_bandwidth')
      .fill(transmittedBandwidth.toString());
    await page
      .locator('#transmitted_bandwidth_is_signal_filtered')
      .getByText('Signal is Filtered')
      .click();

    if (shouldJustify) {
      const justificationInput = page.locator(
        '#transmitted_bandwidth_justification'
      );
      await justificationInput.waitFor({ state: 'visible', timeout: 5000 });
      await justificationInput.fill('Required for HD video uplink');
    }

    await page.locator('#minus_3db_bandwidth').fill('3.00');
    await page
      .locator('#minus_3db_bandwidth_before_or_after_filtering')
      .getByText('Before Filtering')
      .click();
    await page.locator('#minus_20db_bandwidth').fill('10.00');
    await page
      .locator('#minus_20db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();
    await page.locator('#minus_60db_bandwidth').fill('20.00');
    await page
      .locator('#minus_60db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();

    await page.locator('#nature_of_modulating_signals').fill('Digital');
    await page.locator('#emission_designator').fill('16K0F3E');
    await page.locator('#tx_transmission_start').fill('2027-07-01T08:00');
    await page.locator('#tx_transmission_end').fill('2027-07-01T09:00');
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
    await fillReceiverField(page, 0, 'transmission_start', '2027-09-01T08:00');
    await fillReceiverField(page, 0, 'transmission_end', '2027-09-01T09:00');
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

  // === TAB 2: Additional Information (Invalid Values) ===
  await page.getByRole('tab', { name: 'Additional Information' }).click();

  await page
    .locator('#ground_track_from_liftoff_until_payload_separation')
    .fill(''); // Required field left blank

  await page.locator('#ecf_cartesian_vectors_format_file_desc').fill('');

  // Uploading wrong file type
  await page.setInputFiles(
    'input[type="file"]#ecf_cartesian_vectors_format_file',
    path.join(__dirname, 'files', 'cmis.png')
  );

  await page
    .locator('#ground_track_of_launch_vehicle_2d_img_file_desc')
    .fill('');

  // Corrupted image or wrong file
  await page.setInputFiles(
    'input[type="file"]#ground_track_of_launch_vehicle_2d_img_file',
    path.join(__dirname, 'files', 'testECF1.xls')
  );

  await page.locator('#fcc_filing_date').fill('');

  await page.locator('#primary_poc_name').fill('@#dasc');
  await page.locator('#primary_poc_email').fill('2eee@email.com');
  await page.locator('#primary_poc_phone').fill('222');
  await page.locator('#alternate_poc_name').fill('eddie #Jones');
  await page.locator('#alternate_poc_email').fill('EmailWithoutProvider');
  await page.locator('#alternate_poc_phone').fill('555123123');

  await page.getByRole('tab', { name: 'Summary' }).click();

  await expect(
    page.getByRole('tab', { name: 'Additional Information' })
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.locator('#ground_track_from_liftoff_until_payload_separation')
  ).toHaveAttribute('aria-invalid', 'true');
});
