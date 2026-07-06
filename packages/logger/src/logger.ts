import path from 'path';
import { fileURLToPath } from 'url';

import winston, { transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { createAzureTransport } from './transports/azure-transport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { printf, timestamp, colorize, combine } = winston.format;

// Format for console and file outputs
const consoleFormat = printf((info) => {
  if (info.level.includes('error')) {
    return `${info.timestamp} ${info.level}: ${JSON.stringify(info.message, null, 2)}`;
  }
  return `${info.timestamp} [${info.label ?? ''}] ${info.level}: ${JSON.stringify(info.message, null, 2)}`;
});

// Format for Azure Application Insights
const _azureFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf((info): string => {
    // Handle different message patterns
    let message = info.message;

    // Pattern 1: String message (simple case)
    if (typeof message === 'string') {
      return message;
    }

    // Pattern 2: Object with 'msg' field (structured logging)
    if (typeof message === 'object' && message !== null) {
      if ((message as { msg?: string }).msg) {
        return (message as { msg: string }).msg;
      }
      // Pattern 3: Object without 'msg' field - stringify it
      return JSON.stringify(message);
    }

    // Fallback: convert to string
    return String(message);
  })
);

let globalLogger: winston.Logger | null = null;

export const createLoggerInstance = () => {
  if (globalLogger) {
    return globalLogger;
  }

  // Create base transports with console formatting
  const loggerTransports: winston.transport[] = [
    new transports.Console({
      format: combine(timestamp(), colorize(), consoleFormat),
    }),
    new DailyRotateFile({
      dirname: path.join(__dirname, '../../../logs'), // Log file directory
      filename: 'application-%DATE%.log', // File naming pattern
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d', // Retain logs for 14 days
      format: combine(timestamp(), consoleFormat),
    }),
  ];

  globalLogger = winston.createLogger({
    level: 'info',
    transports: loggerTransports,
  });

  return globalLogger;
};

// Track if Azure transport has been initialized to prevent duplicates
let azureTransportInitialized = false;

/**
 * Initialize Azure Application Insights transport based on environment variables
 * Only adds transport when APPLICATIONINSIGHTS_CONNECTION_STRING is configured
 * Prevents duplicate transport registration
 */
export const initializeAzureTransport = () => {
  if (!globalLogger) {
    return;
  }

  // Prevent duplicate initialization
  if (azureTransportInitialized) {
    console.log(
      'ℹ️  Application Insights transport already initialized, skipping...'
    );
    return;
  }

  // Add Application Insights transport if configured
  if (
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
    process.env.APPINSIGHTS_INSTRUMENTATIONKEY
  ) {
    const appInsightsTransport = createAzureTransport();
    if (appInsightsTransport) {
      globalLogger.add(appInsightsTransport as winston.transport);
      azureTransportInitialized = true;
      console.log('✅ Application Insights transport initialized');
    }
  } else {
    console.log(
      'ℹ️  Application Insights not configured. Logs will only go to console and file.'
    );
    console.log(
      '   To enable Application Insights logging, set APPLICATIONINSIGHTS_CONNECTION_STRING'
    );
  }
};
