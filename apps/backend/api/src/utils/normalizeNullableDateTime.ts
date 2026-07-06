export const normalizeNullableDateTime = (
  value: string | null | undefined
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'null') return null;

  return value;
};
