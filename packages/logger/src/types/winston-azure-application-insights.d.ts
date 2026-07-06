declare module 'winston-azure-application-insights' {
  import { TransportStreamOptions } from 'winston-transport';
  import * as Transport from 'winston-transport';

  export interface AzureApplicationInsightsLoggerOptions extends TransportStreamOptions {
    client?: unknown; // Application Insights client
    level?: string;
    silent?: boolean;
  }

  export class AzureApplicationInsightsLogger extends Transport {
    constructor(_options?: AzureApplicationInsightsLoggerOptions);
  }
}
