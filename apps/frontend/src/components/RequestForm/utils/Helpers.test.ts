// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FieldErrors } from 'react-hook-form';
import { PortalFormDefaults } from '@slfcp/validation';

import { getNonRequiredErrors } from './Helpers';

describe('getNonRequiredErrors', () => {
  describe('positive tests', () => {
    it('should return errors for non-excluded messages', () => {
      const errors: FieldErrors<PortalFormDefaults> = {
        name_of_launch_vehicle: {
          type: 'custom',
          message: 'Invalid format',
        },
        name_of_licensee: {
          type: 'custom',
          message: 'Too short',
        },
      };

      const result = getNonRequiredErrors(errors);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        {
          fieldKey: 'name_of_launch_vehicle',
          fieldName: 'Name Of Launch Vehicle',
          message: 'Invalid format',
        },
        {
          fieldKey: 'name_of_licensee',
          fieldName: 'Name Of Licensee',
          message: 'Too short',
        },
      ]);
    });

    it('should format field names correctly (replace underscores and capitalize)', () => {
      const errors: FieldErrors<PortalFormDefaults> = {
        ground_track_of_launch_vehicle_2d_img_file_desc: {
          type: 'custom',
          message: 'Error message',
        },
      };

      const result = getNonRequiredErrors(errors);

      expect(result[0].fieldName).toBe(
        'Ground Track Of Launch Vehicle 2d Img File Desc'
      );
    });
  });

  describe('negative tests', () => {
    it('should filter out "Required" errors', () => {
      const errors: FieldErrors<PortalFormDefaults> = {
        name_of_launch_vehicle: {
          type: 'required',
          message: 'Required',
        },
      };

      const result = getNonRequiredErrors(errors);

      expect(result).toHaveLength(0);
    });

    it('should filter out frequency related errors', () => {
      const errors: FieldErrors<PortalFormDefaults> = {
        number_of_frequencies: {
          type: 'custom',
          message: 'Number Of Frequencies: No frequencies have been added.',
        },
        frequencies: {
          type: 'custom',
          message: 'Frequencies: Array must contain at least 1 element(s)',
        },
      };

      const result = getNonRequiredErrors(errors);

      expect(result).toHaveLength(0);
    });
  });
});
