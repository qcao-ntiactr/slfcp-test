import { createLoggerInstance } from './logger.js';
const logger = createLoggerInstance();

export default logger;
export { createLoggerInstance, initializeAzureTransport } from './logger.js';
export {
  createAzureTransport,
  flushAzureLogs,
} from './transports/azure-transport.js';
export type { AzureTransportOptions } from './transports/azure-transport.js';
