import * as appInsights from 'applicationinsights';
import { AzureApplicationInsightsLogger } from 'winston-azure-application-insights';

/** Minimal info type compatible with Winston's logform info object */
interface TransformableInfo {
  level: string;
  message: unknown;
  [key: string]: unknown;
}

interface AiTransformableInfo extends TransformableInfo {
  customProperties?: Record<string, unknown>;
}

/** Minimal transport interface so we don't depend on winston-transport */
interface TransportStream {
  log(_info: TransformableInfo, _callback: () => void): void;
}

export interface AzureTransportOptions {
  connectionString?: string;
  instrumentationKey?: string;
  level?: string;
  silent?: boolean;
}

/**
 * Flushes any pending telemetry to Azure Application Insights immediately
 */
export const flushAzureLogs = (): void => {
  if (appInsights.defaultClient) {
    appInsights.defaultClient.flush();
  }
};

/**
 * Create an Azure Application Insights Winston transport.
 * Returns `null` if no connection info is available.
 */
export const createAzureTransport = (
  options: AzureTransportOptions = {}
): AzureApplicationInsightsLogger | null => {
  const connectionString =
    options.connectionString ||
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
    process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING;

  const instrumentationKey =
    options.instrumentationKey ||
    process.env.APPINSIGHTS_INSTRUMENTATIONKEY ||
    process.env.AZURE_APPLICATION_INSIGHTS_INSTRUMENTATION_KEY;

  if (!connectionString && !instrumentationKey) {
    console.warn(
      'Azure Application Insights transport not configured. Please set APPLICATIONINSIGHTS_CONNECTION_STRING or APPINSIGHTS_INSTRUMENTATIONKEY.'
    );
    return null;
  }

  try {
    // Initialize App Insights once
    if (!appInsights.defaultClient) {
      const setup = connectionString
        ? appInsights.setup(connectionString)
        : appInsights.setup(instrumentationKey!);

      setup
        .setAutoCollectRequests(false)
        .setAutoCollectPerformance(false)
        .setAutoCollectExceptions(false)
        .setAutoCollectDependencies(false)
        .setAutoCollectConsole(false);

      // Reduce internal logging noise
      appInsights.Configuration.setInternalLogging(false, false);

      appInsights.start();

      // Configure sampling to reduce Logic Apps telemetry volume
      if (appInsights.defaultClient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (appInsights.defaultClient as any).config.samplingPercentage = 100; // Keep 100% for your app logs
      }

      // Add telemetry processor to set operation_Name from custom properties and filter Logic Apps
      if (appInsights.defaultClient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (appInsights.defaultClient as any).addTelemetryProcessor(
          (envelope: {
            data?: {
              baseData?: {
                properties?: Record<string, unknown>;
                message?: string;
              };
            };
            tags?: Record<string, string>;
          }) => {
            // Filter out Logic Apps telemetry if disabled
            if (process.env.LOGIC_APPS_LOGGING_ENABLED !== 'true') {
              const message = envelope.data?.baseData?.message || '';
              const properties = envelope.data?.baseData?.properties || {};

              // Check for Logic Apps indicators
              const isLogicApps =
                message.includes('Workflow action starts') ||
                message.includes('Workflow action ends') ||
                message.includes('flowName=') ||
                message.includes('actionName=') ||
                properties.flowName ||
                properties.actionName ||
                envelope.tags?.['ai.operation.name']?.includes('workflow');

              if (isLogicApps) {
                return false; // Filter out Logic Apps logs
              }
            }

            // Check if telemetry has operation_name in custom properties
            const properties = envelope.data?.baseData?.properties;
            if (properties?.operation_name) {
              // Set the operation name in the telemetry context
              if (envelope.tags) {
                envelope.tags['ai.operation.name'] =
                  properties.operation_name as string;
              }
            }
            return true;
          }
        );
      }

      // Faster batching
      if (appInsights.defaultClient) {
        const client = appInsights.defaultClient as {
          config: { maxBatchSize: number; maxBatchIntervalMs: number };
        };
        client.config.maxBatchSize = 10;
        client.config.maxBatchIntervalMs = 5000;
      }
    } else {
      console.log(
        'ℹ️  Application Insights client already initialized, reusing existing client'
      );
    }

    const transport = new AzureApplicationInsightsLogger({
      level: options.level || 'info',
      silent: options.silent || false,
      client: appInsights.defaultClient,
    });

    // Tell TS this instance has a .log(info, callback) method (it does, at runtime)
    type LogFn = (_info: TransformableInfo, _callback: () => void) => void;
    const t = transport as unknown as TransportStream;
    const originalLog = t.log.bind(transport) as LogFn;

    // Override the log method to format messages and preserve metadata
    (t as { log: LogFn }).log = function (
      info: TransformableInfo,
      callback: () => void
    ): void {
      const formattedInfo: AiTransformableInfo = {
        ...(info as AiTransformableInfo),
      };
      const msg = formattedInfo.message;

      if (typeof msg === 'object' && msg !== null) {
        const messageObj = msg as Record<string, unknown>;

        if ('msg' in messageObj) {
          // Structured: { msg, ...rest }
          formattedInfo.message = String(messageObj.msg);
          const { msg: _msg, ...otherFields } = messageObj;
          formattedInfo.customProperties = {
            ...(formattedInfo.customProperties ?? {}),
            ...otherFields,
          };
        } else {
          // Object without msg: stringify + keep fields
          formattedInfo.message = JSON.stringify(messageObj);
          formattedInfo.customProperties = {
            ...(formattedInfo.customProperties ?? {}),
            ...messageObj,
          };
        }
      }

      originalLog(formattedInfo, callback);
    };

    return transport;
  } catch (error) {
    console.error(
      'Failed to create Azure Application Insights transport:',
      error
    );
    return null;
  }
};
