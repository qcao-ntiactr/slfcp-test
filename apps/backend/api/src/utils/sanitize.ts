/**
 * Sanitizes input string for safe logging by removing control characters and newlines
 * @param input - String to sanitize
 * @returns Sanitized string safe for logging
 */
export function sanitizeForLogs(input: string): string {
  if (typeof input !== 'string') return '';

  // Replace newline and carriage return with space to prevent log injection
  let sanitized = input.replace(/[\r\n]+/g, ' ');

  // Remove ASCII control characters (0x00–0x1F and 0x7F) without regex
  sanitized = [...sanitized]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f; // keep printable ASCII only
    })
    .join('');

  return sanitized.trim();
}
