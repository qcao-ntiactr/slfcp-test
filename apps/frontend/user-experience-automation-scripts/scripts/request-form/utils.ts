import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const getValidFrequencyAndBandwidth = () => {
  return {
    frequency: 2050,
    transmittedBandwidth: 6,
  };
};

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

export const loginAndOpenRequestForm = async (
  page: Page,
  loginUrl: string,
  formUrl: string
) => {
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('commercial@qa.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'New Request', exact: true }).click();
  await expect(page).toHaveURL(formUrl);
};

export const fillValidLaunchSite = async (page: Page, year = 2030) => {
  await page.locator('#mission_name').fill('Falcon Heavy Demo Mission');
  await page.locator('#name_of_licensee').fill('SpaceX');
  await page.locator('#call_sign').fill('SLI-001');
  await page.locator('#name_of_launch_vehicle').fill('Falcon Heavy');
  await page.locator('#city').fill('Cape Canaveral');
  await page.locator('#state').selectOption({ label: 'Florida' });
  await page.locator('#latitude').fill('28.3922');
  await page.locator('#longitude').fill('80.6077');
  await page.locator('#launch_datetime_primary').fill(`${year}-07-10T08:30`);
  await page.locator('#launch_datetime_backup').fill(`${year}-07-11T08:30`);
  await page.locator('#orbital_location').fill('Geostationary Orbit over 75W');
};

export const fillValidFrequency = async (page: Page, year = 2030) => {
  const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();
  const gain = '12.5';
  const beamwidth = '45';

  await page.locator('#frequency').fill(frequency.toString());
  await page
    .locator('#location_of_transmitter_on_vehicle_or_platform')
    .selectOption({ label: 'First Stage' });
  await page.locator('#eirp').fill('100');
  await page.getByLabel(/Change the EIRP unit/).click();
  const bandwidthField = page.locator('#transmitted_bandwidth');
  await bandwidthField.fill(transmittedBandwidth.toString());
  await bandwidthField.press('Tab');
  await page
    .locator('#transmitted_bandwidth_is_signal_filtered')
    .getByText('Signal is Filtered')
    .click();
  const bandwidthJustification = page.locator(
    '#transmitted_bandwidth_justification'
  );
  await expect(bandwidthJustification).toBeVisible();
  await bandwidthJustification.fill('High data rate required');
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
  await page.locator('#tx_transmission_start').fill(`${year}-07-01T08:00`);
  await page.locator('#tx_transmission_end').fill(`${year}-07-01T09:00`);
  await page.locator('#tx_antenna_type').fill('Patch Antenna');
  await page.locator('#tx_antenna_gain').fill(gain);
  await page.locator('#tx_antenna_beamwidth').fill(beamwidth);
  await page.locator('#tx_antenna_altitude').fill('100');
  await page
    .locator('#tx_antenna_altitude + [aria-label^="Change the altitude unit"]')
    .click();

  await fillReceiverField(page, 0, 'transmission_start', `${year}-07-01T08:00`);
  await fillReceiverField(page, 0, 'transmission_end', `${year}-07-01T09:00`);
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
  await fillReceiverField(page, 0, 'latitude_of_receiving_antenna', '10.1234');
  await fillReceiverField(
    page,
    0,
    'longitude_of_receiving_antenna',
    '-70.5678'
  );
};
