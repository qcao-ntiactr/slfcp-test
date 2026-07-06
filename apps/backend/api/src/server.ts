import express from 'express';
import logger, { initializeAzureTransport } from '@slfcp/logger';

import { createApp } from './app.js';
import { port } from './config.js';
import { sanitizeForLogs } from './utils/sanitize.js';
import { logBusinessEvent } from './utils/structuredLogger.js';

// Initialize Azure Application Insights logging
initializeAzureTransport();

export const app: express.Application = createApp();

// Debug: Log transport count to verify no duplicates
logBusinessEvent(
  `🔍 Logger has ${logger.transports.length} transports configured`,
  'info',
  'server'
);

app.listen(port, () => {
  // Enhanced server startup logging
  const startupId = `startup_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  logBusinessEvent(
    'Backend server started successfully',
    'info',
    'server',
    '',
    {
      startupId,
      port: sanitizeForLogs(port.toString()),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      startupTime: new Date().toISOString(),
      processId: process.pid,
    }
  );
});
