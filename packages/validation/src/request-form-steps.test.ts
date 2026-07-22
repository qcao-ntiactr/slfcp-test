import { describe, expect, it } from 'vitest';

import {
  createFrequencyBandwidthCrossCheckSchema,
  getFrequencyRangeError,
} from './frequency-and-transmitted-bandwidth-schemas';
import { requestWizardSteps } from './request-form-steps';

describe('request wizard validation metadata', () => {
  it('derives field ownership from the step schemas', () => {
    const steps = requestWizardSteps();

    expect(steps.launchSite.fields).toContain('mission_name');
    expect(steps.frequencies.fields).toEqual([
      'number_of_frequencies',
      'frequencies',
    ]);
    expect(steps.additionalInformation.fields).toContain(
      'primary_poc_email'
    );
  });

  it('uses caller-provided frequency ranges in shared validation', () => {
    const ranges = [{ low: 100, high: 200 }];
    const schema = createFrequencyBandwidthCrossCheckSchema(ranges);

    expect(
      schema.safeParse({ frequency: 150, transmitted_bandwidth: 4 }).success
    ).toBe(true);
    expect(
      schema.safeParse({ frequency: 2250, transmitted_bandwidth: 4 }).success
    ).toBe(false);
    expect(getFrequencyRangeError(150, 4, ranges)).toBeNull();
  });

  it('uses caller-provided frequency ranges in wizard step validation', () => {
    const schema = requestWizardSteps([{ low: 100, high: 200 }]).frequencies
      .schema;
    const form = {
      number_of_frequencies: 1,
      frequencies: [{ frequency: 2250, transmitted_bandwidth: 4 }],
    };

    const result = schema.safeParse(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('100–200 MHz'),
        })
      );
    }
  });
});
