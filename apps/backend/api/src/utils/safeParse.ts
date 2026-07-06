/**
 * Safely parses a JSON string into the specified type.
 *
 * @template T - The expected return type after parsing.
 * @param {unknown} value - The value to parse, expected to be a JSON string.
 * @returns {T | undefined} - The parsed value if valid JSON, otherwise undefined.
 */
export const safeParseJSON = <T>(value: unknown): T | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

/**
 * Safely parses a string into an integer.
 *
 * @param {unknown} value - The value to parse, expected to be a string.
 * @returns {number | undefined} - The parsed integer, or undefined if parsing fails.
 */
export const safeParseInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};
