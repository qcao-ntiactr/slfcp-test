export const conformanceOptions = [
  'All',
  'Supports',
  'Mostly Supports',
  'Partially Supports',
  'Does Not Support',
  'Needs Verification',
  'Not Applicable',
];

export const badgePalette: Record<string, string> = {
  Supports: 'green',
  'Mostly Supports': 'teal',
  'Partially Supports': 'orange',
  'Does Not Support': 'red',
  'Needs Verification': 'purple',
  'Not Applicable': 'gray',
};

export const assessmentGridColumns = {
  base: '1fr',
  lg: 'minmax(260px, 0.9fr) minmax(320px, 1.1fr) minmax(380px, 1.4fr)',
};

export const rowGridColumns = {
  base: '1fr',
  lg: `${assessmentGridColumns.lg} 112px`,
};
