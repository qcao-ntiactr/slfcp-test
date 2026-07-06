export type Role = 'NTIA' | 'FEDERAL_AGENCY' | 'COMMERCIAL' | 'unknown';

/**
 * Extracts user role from groups array
 * @param groups - Array of group names or IDs from authentication provider
 * @returns The user's role or 'unknown' if no matching role found
 */
export function extractUserRole(groups: string[]): Role {
  // Check for Entra ID group IDs (when using Entra authentication)
  if (groups.includes(process.env.NTIA_GROUP_ID as string)) return 'NTIA';
  if (groups.includes(process.env.FEDERAL_GROUP_ID as string))
    return 'FEDERAL_AGENCY';
  if (groups.includes(process.env.COMMERCIAL_GROUP_ID as string))
    return 'COMMERCIAL';

  // Check for literal role names (when using test/mock authentication)
  if (groups.includes('NTIA')) return 'NTIA';
  if (groups.includes('FEDERAL_AGENCY')) return 'FEDERAL_AGENCY';
  if (groups.includes('COMMERCIAL')) return 'COMMERCIAL';

  return 'unknown';
}
