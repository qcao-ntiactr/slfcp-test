import type { PortalFormDefaults } from '@slfcp/validation';

const DRAFT_FIELDS_TO_EXCLUDE = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'user',
]);

const shouldIncludeDraftField = (key: string, value: unknown) => {
  if (key === 'fcc_filing_date' && value === '') return true;

  return (
    value !== undefined &&
    value !== null &&
    value !== '' &&
    String(value) !== 'null' &&
    !DRAFT_FIELDS_TO_EXCLUDE.has(key)
  );
};

const appendDraftField = (formData: FormData, key: string, value: unknown) => {
  if (value instanceof File || value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    formData.append(key, JSON.stringify(value));
    return;
  }

  if (key === 'fcc_filing_date' && value === '') {
    formData.append(key, 'null');
    return;
  }

  formData.append(key, String(value));
};

export const createRequestDraftFormData = (values: PortalFormDefaults) => {
  const formData = new FormData();

  Object.entries(values)
    .filter(([key, value]) => shouldIncludeDraftField(key, value))
    .forEach(([key, value]) => appendDraftField(formData, key, value));

  return formData;
};
