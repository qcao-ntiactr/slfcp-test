import { Page } from '@playwright/test';

export const getValidFrequencyAndBandwidth = () => {
  const ranges = [
    { min: 2025, max: 2110 },
    { min: 2200, max: 2290 },
    { min: 2360, max: 2395 },
  ];

  const transmittedBandwidth = +(Math.random() * (10 - 0.1) + 0.1).toFixed(2); // between 0.1 and 10
  const halfBw = transmittedBandwidth / 2;

  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const freqMin = range.min + halfBw;
  const freqMax = range.max - halfBw;

  const frequency = +(Math.random() * (freqMax - freqMin) + freqMin).toFixed(2);

  return { frequency, transmittedBandwidth };
};

/**
 * Helper function to fill receiver fields using multiple selector strategies
 * for compatibility with both old and new receiver structures
 */
export const fillReceiverField = async (
  page: Page,
  receiverIndex: number,
  fieldName: string,
  value: string,
  options?: { selectOption?: boolean; click?: boolean }
) => {
  const { selectOption = false, click = false } = options || {};

  // Multiple selector strategies for robustness
  const selectors = [
    // Deterministic IDs
    `#receivers\\.${receiverIndex}\\.${fieldName}`,
    // New receiver array structure
    `input[name="receivers.${receiverIndex}.${fieldName}"]`,
    `select[name="receivers.${receiverIndex}.${fieldName}"]`,
    `button[name="receivers.${receiverIndex}.${fieldName}"]`,
    // Fallback to data-testid or class-based selectors
    `[data-testid="receiver-${receiverIndex}"] input[name*="${fieldName}"]`,
    `[data-testid="receiver-${receiverIndex}"] select[name*="${fieldName}"]`,
    `[data-testid="receiver-${receiverIndex}"] button[name*="${fieldName}"]`,
    `.receiver-section:nth-child(${receiverIndex + 1}) input[name*="${fieldName}"]`,
    `.receiver-section:nth-child(${receiverIndex + 1}) select[name*="${fieldName}"]`,
    `.receiver-section:nth-child(${receiverIndex + 1}) button[name*="${fieldName}"]`,
  ];

  // Try each selector until one works
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 1000 });

      if (isVisible) {
        if (click) {
          await element.click();
        } else if (selectOption) {
          await element.selectOption({ label: value });
        } else {
          await element.fill(value);
        }
        return; // Success, exit function
      }
      //eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    } catch (error) {
      // Continue to next selector
      continue;
    }
  }

  // Fallback to label-based selectors (less reliable but covers edge cases)
  const labelMappings: Record<string, string> = {
    transmission_start: 'Transmission Start',
    transmission_end: 'Transmission End',
    antenna_type: 'Antenna Type',
    antenna_gain: 'Antenna Gain',
    antenna_beamwidth: 'Antenna Beamwidth',
    antenna_altitude: 'Antenna Altitude',
    antenna_altitude_unit: 'Change the altitude unit',
    location_of_receiving_ground_station:
      'Location of Receiving Ground Station',
    latitude_of_receiving_antenna: 'Latitude of Receiving Antenna',
    longitude_of_receiving_antenna: 'Longitude of Receiving Antenna',
  };

  const labelText = labelMappings[fieldName];
  if (labelText) {
    try {
      const labelElement = page
        .getByLabel(new RegExp(labelText))
        .nth(receiverIndex + 1); // +1 because TX is index 0

      if (click) {
        await labelElement.click();
      } else if (selectOption) {
        await labelElement.selectOption({ label: value });
      } else {
        await labelElement.fill(value);
      }
      return;
    } catch (error) {
      console.warn(
        `Failed to fill receiver field ${fieldName} for receiver ${receiverIndex}:`,
        error
      );
    }
  }

  throw new Error(
    `Could not find receiver field ${fieldName} for receiver ${receiverIndex}`
  );
};
