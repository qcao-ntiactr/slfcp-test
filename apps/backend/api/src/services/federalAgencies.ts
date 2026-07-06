import { Entity } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

export class FederalAgencyService {
  /**
   * Retrieves all FederalAgencies records.
   * @returns {Promise<Entity[]>}
   */
  async getAgencies(): Promise<Entity[]> {
    try {
      return await prisma.entity.findMany({
        where: { type: 'FEDERAL_AGENCY' },
      });
    } catch (error) {
      logError('Error fetching FederalAgencies', error as Error, {
        operation: 'getEntities',
        component: 'federalAgencies_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching FederalAgencies');
    }
  }

  /**
   * Retrieves a FederalAgency by its ID.
   * @param {number} id
   * @returns {Promise<Entity | null>}
   */
  async getFederalAgencyById(id: number): Promise<Entity | null> {
    try {
      const federalAgency = await prisma.entity.findUnique({
        where: { id },
      });
      if (!federalAgency) {
        logWithOperation('warn', 'FederalAgency not found', null, {
          agencyId: id,
        });
        return null;
      }
      return federalAgency;
    } catch (error) {
      logError('Error fetching Federal Agency by id', error as Error, {
        operation: 'getFederalAgencyById',
        component: 'federalAgencies_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching Federal Agency by id');
    }
  }
}
