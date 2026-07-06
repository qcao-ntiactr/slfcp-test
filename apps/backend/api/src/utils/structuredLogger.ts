import { Request, Response } from 'express';
import logger from '@slfcp/logger';

import { sanitizeForLogs } from './sanitize.js';
import { requestContext } from './requestContext.js';

/**
 * Transport-agnostic structured logging utilities
 * Optimizes log payloads for Application Insights while remaining compatible with any transport
 */

// Standard operation types for categorization
/* eslint-disable no-unused-vars */
export enum OperationType {
  HTTP_REQUEST = 'http_request',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  FILE_UPLOAD = 'file_upload',
  EMAIL = 'email',
  AUTHENTICATION = 'authentication',
  BUSINESS_LOGIC = 'business_logic',
  VALIDATION = 'validation',
  WORKFLOW = 'workflow',
}
/* eslint-enable no-unused-vars */

// Base interface for structured log entries
interface BaseLogContext {
  operationType: OperationType;
  component: string;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  timestamp: string;
  environment: string;
}

/**
 * Structured Logger Class - Transport Agnostic
 * Creates optimized log payloads that work well with Application Insights
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private environment: string;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Extract correlation context from Express request
   */

  // Modify getRequestContext:
  private getRequestContext(req?: Request): Partial<BaseLogContext> {
    const activeReq = req || requestContext.get();
    if (!activeReq) return { environment: this.environment };

    return {
      correlationId:
        (activeReq.headers['x-correlation-id'] as string) ||
        (activeReq.headers['x-request-id'] as string) ||
        activeReq.get('x-ms-request-id') ||
        undefined,
      userId:
        activeReq.user?.sub || activeReq.user?.id || activeReq.user?.externalId,
      sessionId: (activeReq as { sessionID?: string }).sessionID,
      requestId: `${activeReq.method}_${activeReq.path}_${Date.now()}`,
      environment: this.environment,
    };
  }

  /**
   * Helper method to create a log entry with user context when request is available
   * Use this for direct logger calls that need user context
   */
  public createLogWithUserContext(
    message: string,
    additionalData: Record<string, unknown> = {},
    req?: Request
  ): Record<string, unknown> {
    const context = this.getRequestContext(req);
    return this.createLogPayload(message, context, additionalData);
  }

  /**
   * Create optimized log payload for Application Insights
   */
  private createLogPayload(
    message: string,
    context: Partial<BaseLogContext>,
    additionalData: Record<string, unknown> = {}
  ) {
    return {
      msg: message, // Primary message for Application Insights
      timestamp: new Date().toISOString(),
      environment: this.environment,
      ...context,
      ...additionalData,
    };
  }

  /**
   * Log HTTP request events
   */
  public logHttpRequest(
    message: string,
    req: Request,
    res?: Response,
    additionalData: Record<string, unknown> = {}
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.HTTP_REQUEST,
        component: 'api',
      },
      {
        operation_name: `${req.method} ${req.path}`,
        method: req.method,
        path: sanitizeForLogs(req.path),
        originalUrl: sanitizeForLogs(req.originalUrl),
        routePath: req.route?.path
          ? sanitizeForLogs(req.route.path)
          : undefined,
        statusCode: res?.statusCode,
        userAgent: sanitizeForLogs(req.get('User-Agent') || ''),
        ip: sanitizeForLogs(req.ip || ''),
        queryParams:
          Object.keys(req.query).length > 0
            ? sanitizeForLogs(JSON.stringify(req.query))
            : undefined,
        ...additionalData,
      }
    );

    logger.info(payload);
  }

  /**
   * Log database operations
   */
  public logDatabaseOperation(
    message: string,
    operation: string,
    table: string,
    duration?: number,
    recordCount?: number,
    req?: Request,
    component: string = 'database'
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.DATABASE,
        component,
      },
      {
        operation: sanitizeForLogs(operation),
        table: sanitizeForLogs(table),
        duration,
        recordCount,
      }
    );

    logger.info(payload);
  }

  /**
   * Log external API calls
   */
  public logExternalApiCall(
    message: string,
    apiName: string,
    endpoint: string,
    method: string,
    statusCode?: number,
    duration?: number,
    req?: Request,
    component: string = 'external_api'
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.EXTERNAL_API,
        component,
      },
      {
        apiName: sanitizeForLogs(apiName),
        endpoint: sanitizeForLogs(endpoint),
        method,
        statusCode,
        duration,
        success: statusCode ? statusCode < 400 : undefined,
      }
    );

    logger.info(payload);
  }

  /**
   * Log file operations
   */
  public logFileOperation(
    message: string,
    operation: string,
    fileName: string,
    fileSize?: number,
    duration?: number,
    req?: Request,
    component: string = 'file_storage'
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.FILE_UPLOAD,
        component,
      },
      {
        operation: sanitizeForLogs(operation),
        fileName: sanitizeForLogs(fileName),
        fileSize,
        duration,
      }
    );

    logger.info(payload);
  }

  /**
   * Log business metrics and events
   */
  public logBusinessEvent(
    message: string,
    eventType: string,
    entityType?: string,
    entityId?: string,
    additionalData: Record<string, unknown> = {},
    req?: Request,
    component: string = 'business'
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.BUSINESS_LOGIC,
        component,
      },
      {
        eventType: sanitizeForLogs(eventType),
        entityType: entityType ? sanitizeForLogs(entityType) : undefined,
        entityId: entityId ? sanitizeForLogs(entityId.toString()) : undefined,
        ...additionalData,
      }
    );

    logger.info(payload);
  }

  /**
   * Log authentication events
   */
  public logAuthEvent(
    message: string,
    event: string,
    success: boolean,
    userId?: string,
    reason?: string,
    additionalData: Record<string, unknown> = {},
    req?: Request,
    component: string = 'auth'
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.AUTHENTICATION,
        component,
      },
      {
        event: sanitizeForLogs(event),
        success,
        userId: userId ? sanitizeForLogs(userId) : undefined,
        reason: reason ? sanitizeForLogs(reason) : undefined,
        ...additionalData,
      }
    );

    logger.info(payload);
  }

  /**
   * Log validation events
   */
  public logValidation(
    message: string,
    validationType: string,
    success: boolean,
    errors?: string[],
    req?: Request,
    component: string = 'validation'
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.VALIDATION,
        component,
      },
      {
        validationType: sanitizeForLogs(validationType),
        success,
        errorCount: errors?.length || 0,
        errors: errors?.map((e) => sanitizeForLogs(e)),
      }
    );

    if (success) {
      logger.info(payload);
    } else {
      logger.warn(payload);
    }
  }

  /**
   * Log workflow events
   */
  public logWorkflowEvent(
    message: string,
    workflowName: string,
    event: string,
    entityId: string,
    entityType: string,
    additionalData: Record<string, unknown> = {},
    req?: Request,
    component: string = 'workflow'
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType: OperationType.WORKFLOW,
        component,
      },
      {
        workflowName: sanitizeForLogs(workflowName),
        event: sanitizeForLogs(event),
        entityId: sanitizeForLogs(entityId),
        entityType: sanitizeForLogs(entityType),
        ...additionalData,
      }
    );

    logger.info(payload);
  }

  /**
   * Log errors with full context
   */
  public logError(
    message: string,
    error: Error | string,
    context: {
      operation?: string;
      component?: string;
      operationType?: OperationType;
      httpStatusCode?: number;
      entityId?: string;
      entityType?: string;
      additionalData?: Record<string, unknown>;
    },
    req?: Request
  ): void {
    const requestContext = this.getRequestContext(req);
    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const payload = this.createLogPayload(
      message,
      {
        ...requestContext,
        operationType: context.operationType || OperationType.BUSINESS_LOGIC,
        component: context.component || 'unknown',
      },
      {
        operation: context.operation
          ? sanitizeForLogs(context.operation)
          : undefined,
        error: sanitizeForLogs(errorMessage),
        stackTrace: stackTrace ? sanitizeForLogs(stackTrace) : undefined,
        httpStatusCode: context.httpStatusCode,
        entityId: context.entityId
          ? sanitizeForLogs(context.entityId)
          : undefined,
        entityType: context.entityType
          ? sanitizeForLogs(context.entityType)
          : undefined,
        ...context.additionalData,
      }
    );

    logger.error(payload);
  }

  /**
   * Log performance metrics
   */
  public logPerformance(
    message: string,
    operation: string,
    duration: number,
    operationType: OperationType,
    component: string,
    additionalMetrics: Record<string, unknown> = {},
    req?: Request
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType,
        component,
      },
      {
        operation: sanitizeForLogs(operation),
        duration,
        ...additionalMetrics,
      }
    );

    logger.info(payload);
  }

  /**
   * Generic structured log method
   */
  public log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    operationType: OperationType,
    component: string,
    additionalData: Record<string, unknown> = {},
    req?: Request
  ): void {
    const context = this.getRequestContext(req);

    const payload = this.createLogPayload(
      message,
      {
        ...context,
        operationType,
        component,
      },
      additionalData
    );

    logger[level](payload);
  }
}

// Export singleton instance
export const structuredLogger = StructuredLogger.getInstance();

// Export convenience functions for common operations
export const logHttpRequest = (
  message: string,
  req: Request,
  res?: Response,
  additionalData?: Record<string, unknown>
) => {
  if (process.env.LOGGING_VERBOSE === 'true') {
    structuredLogger.logHttpRequest(message, req, res, additionalData);
  }
};

/**
 * Helper function to create log entries with operation_name for controller methods
 * Use this in controllers to ensure consistent operation_name logging
 */
export const logWithOperation = (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  req?: Request,
  additionalData: Record<string, unknown> = {}
) => {
  if (process.env.LOGGING_VERBOSE !== 'true') return;
  const logData = {
    msg: message,
    operation_name: `${req?.method} ${req?.path}`,
    method: req?.method,
    path: req?.path,
    originalUrl: req?.originalUrl,
    routePath: req?.route?.path,
    ...additionalData,
  };
  logger[level](logData);
};

export const logDatabaseOperation = (
  message: string,
  operation: string,
  table: string,
  duration?: number,
  recordCount?: number,
  req?: Request
) => {
  if (process.env.LOGGING_VERBOSE === 'true') {
    structuredLogger.logDatabaseOperation(
      message,
      operation,
      table,
      duration,
      recordCount,
      req
    );
  }
};

export const logExternalApiCall = (
  message: string,
  apiName: string,
  endpoint: string,
  method: string,
  statusCode?: number,
  duration?: number,
  req?: Request
) => {
  if (process.env.LOGGING_VERBOSE === 'true') {
    structuredLogger.logExternalApiCall(
      message,
      apiName,
      endpoint,
      method,
      statusCode,
      duration,
      req
    );
  }
};

export const logFileOperation = (
  message: string,
  operation: string,
  fileName: string,
  fileSize?: number,
  duration?: number,
  req?: Request
) => {
  if (process.env.LOGGING_VERBOSE === 'true') {
    structuredLogger.logFileOperation(
      message,
      operation,
      fileName,
      fileSize,
      duration,
      req
    );
  }
};

export const logBusinessEvent = (
  message: string,
  eventType: string,
  entityType?: string,
  entityId?: string,
  additionalData?: Record<string, unknown>,
  req?: Request
) =>
  structuredLogger.logBusinessEvent(
    message,
    eventType,
    entityType,
    entityId,
    additionalData,
    req
  );

export const logAuthEvent = (
  message: string,
  event: string,
  success: boolean,
  userId?: string,
  reason?: string,
  additionalData?: Record<string, unknown>,
  req?: Request,
  component?: string
) =>
  structuredLogger.logAuthEvent(
    message,
    event,
    success,
    userId,
    reason,
    additionalData,
    req,
    component
  );

export const logValidation = (
  message: string,
  validationType: string,
  success: boolean,
  errors?: string[],
  req?: Request
) => {
  if (process.env.LOGGING_VERBOSE === 'true') {
    structuredLogger.logValidation(
      message,
      validationType,
      success,
      errors,
      req
    );
  }
};

export const logWorkflowEvent = (
  message: string,
  workflowName: string,
  event: string,
  entityId: string,
  entityType: string,
  additionalData?: Record<string, unknown>,
  req?: Request
) => {
  if (process.env.LOGGING_VERBOSE === 'true') {
    structuredLogger.logWorkflowEvent(
      message,
      workflowName,
      event,
      entityId,
      entityType,
      additionalData,
      req
    );
  }
};

export const logError = (
  message: string,
  error: Error | string,
  context: {
    operation?: string;
    component?: string;
    operationType?: OperationType;
    httpStatusCode?: number;
    entityId?: string;
    entityType?: string;
    additionalData?: Record<string, unknown>;
  },
  req?: Request
) => {
  structuredLogger.logError(message, error, context, req);
};

export const logPerformance = (
  message: string,
  operation: string,
  duration: number,
  operationType: OperationType,
  component: string,
  additionalMetrics?: Record<string, unknown>,
  req?: Request
) => {
  if (process.env.LOGGING_VERBOSE === 'true') {
    structuredLogger.logPerformance(
      message,
      operation,
      duration,
      operationType,
      component,
      additionalMetrics,
      req
    );
  }
};

export const createLogWithUserContext = (
  message: string,
  additionalData?: Record<string, unknown>,
  req?: Request
) => structuredLogger.createLogWithUserContext(message, additionalData, req);
