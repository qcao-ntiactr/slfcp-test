import axios from 'axios';

import { azureWorkflowUrl } from '../config.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { logError } from '../utils/structuredLogger.js';

export class WorkflowService {
  /**
   * Gets the next status from the Azure workflow service
   * @param currentStatus - Current status object to send to workflow
   * @returns Promise resolving to the next status data
   * @throws Error if workflow API call fails
   */
  static async getNextStatus(currentStatus: unknown) {
    try {
      const response = await axios.post(azureWorkflowUrl!, currentStatus);
      return response.data;
    } catch (error) {
      // Structured log to avoid log injection; keep message constant and put values in fields.
      logError('Workflow API error', error as Error, {
        additionalData: {
          error: sanitizeForLogs(String(error)),
          workflowUrl: azureWorkflowUrl,
        },
      });
      throw new Error('Failed to fetch next status from workflow.');
    }
  }
}
