import NodeCache from 'node-cache';

import prisma from '../utils/database.js';
import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { makeCacheKey } from '../utils/makeCacheKey.js';
import { dashboardLiveDataEnabled } from '../config.js';
import type { components } from '../types/requests.js';

type RequestsOverTimeData = components['schemas']['RequestsOverTimeData'];
type RequestCompletionTimeData =
  components['schemas']['RequestCompletionTimeData'];
type RequestsByCommercialEntityData =
  components['schemas']['RequestsByCommercialEntityData'];
type RequestsByStatusData = components['schemas']['RequestsByStatusData'];

export type Timeframe = 'week' | 'month' | 'quarter';

export interface DashboardServiceOptions {
  liveDataEnabled?: boolean;
}

/**
 * Dashboard Service
 * Provides access to dashboard metrics and analytics
 * Queries database views that are periodically refreshed for performance.
 * Uses in-memory caching (node-cache) for per-instance cache of summary data.
 */
export class DashboardService {
  private cache = new NodeCache();
  private liveDataEnabled: boolean;
  private TTL_SECONDS: Record<Timeframe, number> = {
    week: 7 * 24 * 60 * 60,
    month: 30 * 24 * 60 * 60,
    quarter: 90 * 24 * 60 * 60,
  };

  constructor(options: DashboardServiceOptions = {}) {
    this.liveDataEnabled = options.liveDataEnabled ?? dashboardLiveDataEnabled;
  }

  /** Generic helper to query a database view with caching & error handling. */
  private async queryCachedView<T>(
    operation: string,
    viewName: string,
    timeframe?: Timeframe
  ): Promise<T[]> {
    const now = new Date();
    const key = timeframe ? makeCacheKey(operation, timeframe, now) : operation;

    if (this.liveDataEnabled) {
      logWithOperation('info', 'Dashboard cache bypassed:', null, {
        key: key,
      });
    } else {
      const cached = this.cache.get<T[]>(key);
      if (cached !== undefined) {
        logWithOperation('info', 'Cache hit:', null, {
          key: key,
        });
        return cached;
      }

      logWithOperation('info', 'Cache miss:', null, {
        key: key,
      });
    }

    try {
      // Use $queryRawUnsafe for dynamic table/view name
      const result = await prisma.$queryRawUnsafe<T[]>(
        `SELECT * FROM ${viewName};`
      );

      if (!this.liveDataEnabled) {
        const ttl = timeframe ? this.TTL_SECONDS[timeframe] : 24 * 60 * 60;
        this.cache.set(key, result, ttl);
      }

      return result;
    } catch (error) {
      logError(`Error fetching data from ${viewName}`, error as Error, {
        operation,
        component: 'dashboard_service',
        additionalData: {
          error: sanitizeForLogs(String(error)),
          sourceView: viewName,
        },
      });
      throw new Error(`Error fetching data from ${viewName}`);
    }
  }

  // ─── Requests submitted ─────────────────────────────────────────────────────────
  getRequestsSubmitted_lastWeek() {
    return this.queryCachedView<RequestsOverTimeData>(
      'dashboard:getRequestsSubmitted',
      'requests_submitted_week',
      'week'
    );
  }

  getRequestsSubmitted_lastMonth() {
    return this.queryCachedView<RequestsOverTimeData>(
      'dashboard:getRequestsSubmitted',
      'requests_submitted_month',
      'month'
    );
  }

  getRequestsSubmitted_lastQuarter() {
    return this.queryCachedView<RequestsOverTimeData>(
      'dashboard:getRequestsSubmitted',
      'requests_submitted_quarter',
      'quarter'
    );
  }

  // ─── Request completion time ─────────────────────────────────────────────────────
  getRequestCompletionTime_lastWeek() {
    return this.queryCachedView<RequestCompletionTimeData>(
      'dashboard:getRequestCompletionTime',
      'request_completion_summary_week',
      'week'
    );
  }

  getRequestCompletionTime_lastMonth() {
    return this.queryCachedView<RequestCompletionTimeData>(
      'dashboard:getRequestCompletionTime',
      'request_completion_summary_month',
      'month'
    );
  }

  getRequestCompletionTime_lastQuarter() {
    return this.queryCachedView<RequestCompletionTimeData>(
      'dashboard:getRequestCompletionTime',
      'request_completion_summary_quarter',
      'quarter'
    );
  }

  // ─── Request count by commercial entity ─────────────────────────────────────────
  getRequestCountByCommercialEntity() {
    return this.queryCachedView<RequestsByCommercialEntityData>(
      'dashboard:getRequestCountByCommercialEntity',
      'commercial_entity_submission_count'
    );
  }

  // ─── Requests by status ─────────────────────────────────────────────────────────
  getRequestsByStatus() {
    return this.queryCachedView<RequestsByStatusData>(
      'dashboard:getRequestsByStatus',
      'requests_by_status'
    );
  }
}
