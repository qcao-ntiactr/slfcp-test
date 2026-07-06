import { test } from '@playwright/test';
import dotenv from 'dotenv';

import { fillReceiverField } from './utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

const numFrequencies = parseInt(process.env.NUM_FREQ || '1', 10);

test(`Login and add ${numFrequencies} invalid frequency(ies)`, async ({
  page,
}) => {
  // --- Login ---
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
  await page.locator('#launch_datetime_primary').fill('2027-07-10T08:30');
  await page.locator('#launch_datetime_backup').fill('2027-07-11T08:30');
  await page.locator('#orbital_location').fill('Geostationary Orbit over 75W');

  await page.locator('.forward-submit-btn').click(); // go to Frequencies tab

  // === TAB 1: Frequencies ===
  await page
    .getByLabel('Number Of Frequencies')
    .fill(numFrequencies.toString());

  for (let i = 0; i < numFrequencies; i++) {
    await page.waitForTimeout(200);

    // Fill invalid frequency: non-numeric
    await page.locator('#frequency').fill('500');

    // Invalid option for transmitter location
    await page
      .locator('#location_of_transmitter_on_vehicle_or_platform')
      .selectOption({ label: 'Please select an option' })
      .catch(() => {}); // skip error if option doesn't exist

    // Invalid EIRP: negative number
    await page.locator('#eirp').fill('-50');

    await page.getByLabel(/Change the EIRP unit/).click();

    // Invalid bandwidth: overly large number
    await page.locator('#transmitted_bandwidth').fill('100000');

    await page
      .locator('#transmitted_bandwidth_is_signal_filtered')
      .getByText('Signal is Not Filtered')
      .click();

    // Provide no justification (required if BW > 5)
    // We'll skip filling 'Bandwidth Justification'

    // Fill nonsense bandwidths
    await page.locator('#minus_3db_bandwidth').fill('-900000');
    await page
      .locator('#minus_3db_bandwidth_before_or_after_filtering')
      .getByText('Before Filtering')
      .click();

    await page.locator('#minus_20db_bandwidth').fill('-55555');
    await page
      .locator('#minus_20db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();

    await page.locator('#minus_60db_bandwidth').fill('1000000');
    await page
      .locator('#minus_60db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();

    await page.locator('#nature_of_modulating_signals').fill('');
    await page.locator('#emission_designator').fill(''); // Empty for bad values test

    // TX (some missing, some invalid)
    await page.locator('#tx_transmission_start').fill('');
    await page.locator('#tx_transmission_end').fill('');
    await page.locator('#tx_antenna_type').fill('');
    await page.locator('#tx_antenna_gain').fill('12345467');
    await page.locator('#tx_antenna_beamwidth').fill('9999');
    await page.locator('#tx_antenna_altitude').fill('-3333');
    await page
      .getByLabel(/Change the altitude unit/)
      .first()
      .click();

    // Receiver Section (leave blank for validation errors)
    await fillReceiverField(page, 0, 'transmission_start', '');
    await fillReceiverField(page, 0, 'transmission_end', '');
    await fillReceiverField(page, 0, 'antenna_type', '');
    await fillReceiverField(page, 0, 'antenna_gain', '');
    await fillReceiverField(page, 0, 'antenna_beamwidth', '');
    await fillReceiverField(page, 0, 'antenna_altitude', '');

    await fillReceiverField(page, 0, 'latitude_of_receiving_antenna', '999'); // invalid latitude
    await fillReceiverField(page, 0, 'longitude_of_receiving_antenna', 'abc'); // invalid longitude

    await page.getByRole('button', { name: /Add Frequency/i }).click();
    await page.waitForTimeout(400);
  }

  await page.pause(); // Observe form errors or validation behavior
});
