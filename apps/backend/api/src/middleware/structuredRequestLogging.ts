import { ServerResponse } from 'http';

import { Request, Response, NextFunction } from 'express';

import {
  OperationType,
  logHttpRequest,
  logError,
} from '../utils/structuredLogger.js';

/**
 * Transport-agnostic middleware for automatic request logging
 * Creates structured logs optimized for Application Insights
 */

/**
 * Request logging middleware - transport agnostic
 * Automatically logs HTTP requests with timing and correlation
 */
export const structuredRequestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip logging for OPTIONS requests (CORS preflight) unless in verbose mode
  const shouldSkipLogging =
    req.method === 'OPTIONS' && process.env.LOGGING_VERBOSE !== 'true';

  // Record start time
  req.startTime = Date.now();

  // Generate or extract correlation ID
  req.correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    req.get('x-ms-request-id') ||
    `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Set correlation ID in response headers for client tracking
  res.setHeader('x-correlation-id', req.correlationId);

  // Log request start only in verbose mode
  if (process.env.LOGGING_VERBOSE === 'true' && !shouldSkipLogging) {
    logHttpRequest('HTTP request started', req, undefined, {
      startTime: new Date().toISOString(),
    });
  }

  // Log on normal completion
  const onFinish = () => {
    if (shouldSkipLogging) return;

    const duration = req.startTime ? Date.now() - req.startTime : 0;
    logHttpRequest('HTTP request completed', req, res, {
      duration,
      success: res.statusCode < 400,
      endTime: new Date().toISOString(),
    });
  };

  // Log if connection closed before finish (aborted)
  const onClose = () => {
    // If finish already fired, skip double logging
    // (Node emits 'close' after 'finish' in some cases; we only want 'aborted' cases)
    if ((res as ServerResponse).writableEnded) return;

    // Skip logging aborted OPTIONS requests unless in verbose mode
    if (shouldSkipLogging) return;

    const duration = req.startTime ? Date.now() - req.startTime : 0;
    logHttpRequest('HTTP request aborted', req, res, {
      duration,
      success: false,
      endTime: new Date().toISOString(),
      aborted: true,
    });
  };

  res.once('finish', onFinish);
  res.once('close', onClose);

  next();
};

/**
 * Error logging middleware - transport agnostic
 * Captures and logs unhandled errors with full context
 */
export const structuredErrorLoggingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logError(
    'Unhandled HTTP request error',
    error,
    {
      operation: `${req.method} ${req.path}`,
      component: 'api',
      operationType: OperationType.HTTP_REQUEST,
      httpStatusCode: res.statusCode || 500,
      additionalData: {
        operation_name: `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      },
    },
    req
  );

  // Continue standard error handling
  next(error);
};
