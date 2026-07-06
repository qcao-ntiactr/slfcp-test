/**
 * Formats a numerical request ID into the format SLFCP-XXXXX-YYYY
 * @param requestId - The request ID from the database
 * @param createdAt - The date the request was created
 * @returns A formatted string representing the request ID
 */
export const formatRequestId = (
  requestId: number | string,
  createdAt?: Date | string
) => {
  const date = createdAt ? new Date(createdAt) : new Date();
  const year = date.getUTCFullYear();
  const idStr = requestId.toString().padStart(5, '0');
  return `SLFCP-${idStr}-${year}`;
};
