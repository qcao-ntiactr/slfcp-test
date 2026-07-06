import { Timeframe } from '../routers/dashboard.js';
import { DashboardService } from '../services/dashboard.js';
import { stringifyBigInts } from '../utils/stringifyBigInts.js';
import { logError } from '../utils/structuredLogger.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import type { components } from '../types/requests.js';
import { roundToWholeDays } from '../utils/roundToWholeDays.js';

type RequestCompletionTimeData =
  components['schemas']['RequestCompletionTimeData'];

export class DashboardController {
  dashboardService = new DashboardService();

  getRequestsOverTime = async (timeframe: Timeframe) => {
    try {
      switch (timeframe) {
        case 'week': {
          const lastWeekResult =
            await this.dashboardService.getRequestsSubmitted_lastWeek();
          return stringifyBigInts(lastWeekResult);
        }
        case 'month': {
          const lastMonthResult =
            await this.dashboardService.getRequestsSubmitted_lastMonth();
          return stringifyBigInts(lastMonthResult);
        }
        case 'quarter': {
          const lastQuarterResult =
            await this.dashboardService.getRequestsSubmitted_lastQuarter();
          return stringifyBigInts(lastQuarterResult);
        }
        default:
          throw new Error('Invalid timeframe');
      }
    } catch (error) {
      logError('Error in getRequestsOverTime', error as Error, {
        operation: 'getRequestsOverTime',
        component: 'dashboard_controller',
        additionalData: {
          error: sanitizeForLogs(String(error)),
          timeframe,
        },
      });
      throw error;
    }
  };

  getRequestCompletionTime = async (timeframe: Timeframe) => {
    try {
      let result: RequestCompletionTimeData[];
      switch (timeframe) {
        case 'week': {
          result =
            await this.dashboardService.getRequestCompletionTime_lastWeek();
          break;
        }
        case 'month': {
          result =
            await this.dashboardService.getRequestCompletionTime_lastMonth();
          break;
        }
        case 'quarter': {
          result =
            await this.dashboardService.getRequestCompletionTime_lastQuarter();
          break;
        }
        default:
          throw new Error('Invalid timeframe');
      }

      const processedResult: RequestCompletionTimeData[] = result.map(
        (item) => {
          const { avg_days, fastest_days, slowest_days, total_completed } =
            item;

          return {
            avg_days: roundToWholeDays(avg_days),
            fastest_days: roundToWholeDays(fastest_days),
            slowest_days: roundToWholeDays(slowest_days),
            total_completed: total_completed,
          };
        }
      );
      return stringifyBigInts(processedResult);
    } catch (error) {
      logError('Error in getRequestCompletionTime', error as Error, {
        operation: 'getRequestCompletionTime',
        component: 'dashboard_controller',
        additionalData: {
          error: sanitizeForLogs(String(error)),
          timeframe,
        },
      });
      throw error;
    }
  };

  getRequestsByCommercialEntity = async () => {
    try {
      const count =
        await this.dashboardService.getRequestCountByCommercialEntity();
      return stringifyBigInts(count);
    } catch (error) {
      logError('Error in getRequestsByCommercialEntity', error as Error, {
        operation: 'getRequestsByCommercialEntity',
        component: 'dashboard_controller',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  };

  getRequestsByStatus = async () => {
    try {
      const byStatus = await this.dashboardService.getRequestsByStatus();
      return stringifyBigInts(byStatus);
    } catch (error) {
      logError('Error in getRequestsByStatus', error as Error, {
        operation: 'getRequestsByStatus',
        component: 'dashboard_controller',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  };
}
