/**
 * Formats the tab header text for display based on entity type.
 * Maps entity type constants to user-friendly display names using the provided mapping.
 * Falls back to the raw entity type if no mapping exists.
 *
 * @param entityType - The entity type to format (COMMERCIAL, FEDERAL_AGENCY, or NTIA)
 * @param tabHeaders - Record mapping entity types to their display names
 * @returns The formatted display name for the tab header
 */
export const formatTabHeader = (
  entityType: 'COMMERCIAL' | 'FEDERAL_AGENCY' | 'NTIA',
  tabHeaders: Record<'COMMERCIAL' | 'FEDERAL_AGENCY' | 'NTIA', string>
) => {
  return tabHeaders[entityType] || entityType;
};
