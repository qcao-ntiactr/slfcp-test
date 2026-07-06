import { describe, it, expect } from 'vitest';

import { formatTabHeader } from './InquiryHelpers';

const tabHeaders = {
  COMMERCIAL: 'Commercial Entity',
  FEDERAL_AGENCY: 'Federal Agency',
  NTIA: 'National Telecommunications and Information Administration',
};

describe('formatTabHeader - positive cases', () => {
  it('returns the correct display name for COMMERCIAL', () => {
    const result = formatTabHeader('COMMERCIAL', tabHeaders);
    expect(result).toBe('Commercial Entity');
  });

  it('returns the correct display name for FEDERAL_AGENCY', () => {
    const result = formatTabHeader('FEDERAL_AGENCY', tabHeaders);
    expect(result).toBe('Federal Agency');
  });

  it('returns the correct display name for NTIA', () => {
    const result = formatTabHeader('NTIA', tabHeaders);
    expect(result).toBe(
      'National Telecommunications and Information Administration'
    );
  });
});

describe('formatTabHeader - negative cases', () => {
  it('falls back to entityType if mapping is missing', () => {
    const incompleteHeaders = {
      COMMERCIAL: 'Commercial Entity',
      FEDERAL_AGENCY: 'Federal Agency',
      NTIA: undefined as unknown as string, // simulate missing value
    };

    const result = formatTabHeader('NTIA', incompleteHeaders);
    expect(result).toBe('NTIA');
  });

  it('falls back to entityType if mapping is an empty string', () => {
    const blankHeaders = {
      COMMERCIAL: 'Commercial Entity',
      FEDERAL_AGENCY: 'Federal Agency',
      NTIA: '',
    };

    const result = formatTabHeader('NTIA', blankHeaders);
    expect(result).toBe('NTIA');
  });
});
