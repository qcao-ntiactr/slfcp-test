import { Request, Response } from 'express';

import { FrequencyRangeService } from '../services/frequencyranges.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import {
  logError,
  OperationType,
  logWithOperation,
} from '../utils/structuredLogger.js';

/**
 * Handles the request to get frequency ranges.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export const getFrequencyRanges = async (req: Request, res: Response) => {
  try {
    const frequencyRanges =
      await new FrequencyRangeService().getAllowedFrequencyRanges();

    logWithOperation('info', 'Retrieved frequency ranges', req, {
      frequencyRangesCount: frequencyRanges.length,
      frequencyRanges: sanitizeForLogs(JSON.stringify(frequencyRanges)),
    });
    if (frequencyRanges.length) {
      res.status(200).json(frequencyRanges);
    }
  } catch (error) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError('Error retrieving frequency ranges', error as Error, {
      operation: 'getFrequencyRanges',
      component: 'frequency_ranges',
      operationType: OperationType.HTTP_REQUEST,
      httpStatusCode: 500,
    });
    res.status(500);
  }
};
