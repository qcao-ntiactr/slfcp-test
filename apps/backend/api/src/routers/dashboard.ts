import express from 'express';

import { dashboardLiveDataEnabled } from '../config.js';
import { DashboardController } from '../controllers/dashboard.js';
import { logError } from '../utils/structuredLogger.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

const router: express.Router = express.Router();

const controller = new DashboardController();

// Runtime safe union
const validTimeframes = ['week', 'month', 'quarter'] as const;
export type Timeframe = (typeof validTimeframes)[number];

// type guard for Timeframe
function isValidTimeframe(value: unknown): value is Timeframe {
  return (
    typeof value === 'string' && validTimeframes.includes(value as Timeframe)
  );
}

router.use('/dashboard', (req, res, next) => {
  if (dashboardLiveDataEnabled) {
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];

    res.set({
      'Cache-Control':
        'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });
  }

  next();
});

router.get('/dashboard/requests-over-time/:timeframe', async (req, res) => {
  const timeframe = req.params.timeframe;
  if (!isValidTimeframe(timeframe)) {
    return res.status(400).json({ error: 'Invalid timeframe' });
  }
  try {
    const response = await controller.getRequestsOverTime(timeframe);
    res.json(response);
  } catch (error) {
    logError('Error in dashboard requests-over-time', error as Error, {
      operation: 'GET /dashboard/requests-over-time/:timeframe',
      component: 'dashboard_router',
      additionalData: {
        error: sanitizeForLogs(String(error)),
        timeframe,
      },
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get(
  '/dashboard/request-completion-time/:timeframe',
  async (req, res) => {
    const timeframe = req.params.timeframe;
    if (!isValidTimeframe(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe' });
    }
    try {
      const response = await controller.getRequestCompletionTime(timeframe);
      res.json(response);
    } catch (error) {
      logError('Error in dashboard request-completion-time', error as Error, {
        operation: 'GET /dashboard/request-completion-time/:timeframe',
        component: 'dashboard_router',
        additionalData: {
          error: sanitizeForLogs(String(error)),
          timeframe,
        },
      });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/dashboard/requests-by-commercial-entity', async (_req, res) => {
  try {
    const response = await controller.getRequestsByCommercialEntity();
    res.json(response);
  } catch (error) {
    logError(
      'Error in dashboard requests-by-commercial-entity',
      error as Error,
      {
        operation: 'GET /dashboard/requests-by-commercial-entity',
        component: 'dashboard_router',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      }
    );
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dashboard/requests-by-status', async (_req, res) => {
  try {
    const response = await controller.getRequestsByStatus();
    res.json(response);
  } catch (error) {
    logError('Error in dashboard requests-by-status', error as Error, {
      operation: 'GET /dashboard/requests-by-status',
      component: 'dashboard_router',
      additionalData: {
        error: sanitizeForLogs(String(error)),
      },
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
