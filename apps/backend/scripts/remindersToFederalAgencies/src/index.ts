import * as path from 'path';
import { fileURLToPath } from 'url';

import * as dotenv from 'dotenv';
import cron from 'node-cron';
import { initializeAzureTransport } from '@slfcp/logger';

import {
  logError,
  logWithOperation,
} from '../../../api/src/utils/structuredLogger.js';

import { sendPendingConcurrenceAndApprovalReminders } from './../../../api/src/controllers/requests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, './../../../.env') });

// Initialize Azure Application Insights transport after dotenv
initializeAzureTransport();

// Helper to safely get environment variables
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value) return value;
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Missing required environment variable: ${key}`);
};

const remindersToFederalAgencies = async () => {
  const startTime = new Date();

  try {
    logWithOperation(
      'info',
      'Starting Federal Agencies reminder process',
      null,
      {
        startTime: startTime.toISOString(),
      }
    );

    const pendingRequests = await sendPendingConcurrenceAndApprovalReminders();

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    logWithOperation('info', 'Reminders completed successfully', null, {
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      remindersSent: (await pendingRequests).length,
    });
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError('Reminders failed', error as Error, {
      operation: 'remindersToFederalAgencies',
      component: 'scripts',
      additionalData: {
        endTime: endTime.toISOString(),
        duration: `${duration}ms`,
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
    });

    // Don't throw - let the process continue running
  } finally {
    logWithOperation('info', 'Reminder process finished', null, {
      finishTime: new Date().toISOString(),
    });
  }
};

// Configure cron schedule based on environment variables
const cronSchedule = getEnv('EMAIL_REMINDERS_CRON_SCHEDULE', '0 9 * * *'); // Default: daily at 9 AM
const enableCron = getEnv('EMAIL_REMINDERS_ENABLE_CRON', 'false') === 'true'; // Default: disabled

logWithOperation('info', 'Federal Agencies Reminder Script Starting', null, {
  cronEnabled: enableCron,
  cronSchedule: cronSchedule,
});

if (enableCron) {
  logWithOperation('info', 'Setting up cron schedule', null, {
    schedule: cronSchedule,
  });
  cron.schedule(cronSchedule, () => {
    logWithOperation('info', 'Cron triggered', null, {
      triggerTime: new Date().toISOString(),
    });
    remindersToFederalAgencies();
  });
} else {
  logWithOperation('info', 'Cron scheduling disabled', null, {
    reason: 'EMAIL_REMINDERS_ENABLE_CRON=false',
  });
}

// Run once on startup if enabled
const runOnStartup =
  getEnv('EMAIL_REMINDERS_RUN_ON_STARTUP', 'true') === 'true';

logWithOperation('info', 'Startup configuration', null, {
  runOnStartup: runOnStartup,
});

if (runOnStartup) {
  logWithOperation('info', 'Running reminders on startup');
  remindersToFederalAgencies();
} else {
  logWithOperation('info', 'Startup execution disabled', null, {
    reason: 'EMAIL_REMINDERS_RUN_ON_STARTUP=false',
  });
}

// Keep the process alive for PM2 (this prevents restart loops)
logWithOperation(
  'info',
  'Script initialized, process will stay alive for PM2',
  null,
  {
    environmentConfig: {
      enableCron: process.env.EMAIL_REMINDERS_ENABLE_CRON || 'false (default)',
      cronSchedule:
        process.env.EMAIL_REMINDERS_CRON_SCHEDULE || '0 9 * * * (default)',
      runOnStartup:
        process.env.EMAIL_REMINDERS_RUN_ON_STARTUP || 'true (default)',
    },
  }
);

// Keep process running (prevents PM2 from restarting due to exit)
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGINT', () => {
  logWithOperation('info', 'Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logWithOperation('info', 'Received SIGTERM, shutting down gracefully');
  process.exit(0);
});
