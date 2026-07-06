import { logError } from '../utils/structuredLogger.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

/**
 * Service for managing frequency range operations.
 * @class
 */
export class FrequencyRangeService {
  /**
   * Retrieves all allowed frequency ranges from the database.
   * @async
   * @function getAllowedFrequencyRanges
   * @returns {Promise<import('@prisma/client').AllowedFrequencyRange[]>} A promise resolving to an array of allowed frequency ranges.
   * @throws {Error} Throws an error if the database query fails.
   * @description Fetches the list of allowed frequency ranges from the database using Prisma.
   */
  async getAllowedFrequencyRanges() {
    try {
      return await prisma.allowedFrequencyRange.findMany();
    } catch (error) {
      logError('Error fetching allowed frequency range', error as Error, {
        operation: 'getAllowedFrequencyRanges',
        component: 'frequencyRange_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching allowed frequency range');
    }
  }
}
