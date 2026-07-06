/**
 * Formats a phone number input into the (XXX) XXX-XXXX format.
 *
 * @param {string} input - The raw phone number string containing digits and possibly other characters.
 * @returns {string} - The formatted phone number.
 */
export const applyPhoneNumberMask = (input: string) => {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

/**
 * Unformats a phone number by converting it into a standard hyphenated format: XXX-XXX-XXXX.
 *
 * @param {string} input - The formatted or unformatted phone number string.
 * @returns {string} - The unformatted phone number in a hyphenated format.
 */
export const unformatPhoneNumber = (input: string): string => {
  const digits = input.replace(/\D/g, ''); // Remove all non-digit characters
  const part1 = digits.slice(0, 3); // First 3 digits
  const part2 = digits.slice(3, 6); // Next 3 digits
  const part3 = digits.slice(6, 10); // Last 4 digits

  // Format as xxx-xxx-xxxx, but allow incomplete numbers
  return `${part1}${part2 ? '-' + part2 : ''}${part3 ? '-' + part3 : ''}`;
};
