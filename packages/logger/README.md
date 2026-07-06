# @slfcp/logger

A Winston-based logger with support for console, file rotation, and Azure Application Insights logging.

## Features

- **Console logging** with colorized output
- **Daily rotating file logs** (retained for 14 days)
- **Azure Application Insights integration** for cloud logging
- **TypeScript support**
- **Environment-based configuration**

## Installation

```bash
pnpm install @slfcp/logger
```

## Basic Usage

```typescript
import logger from '@slfcp/logger';

logger.info('Application started');
logger.error('Something went wrong', { error: 'details' });
logger.warn('This is a warning');
```

## Azure Application Insights Setup

To enable Azure Application Insights logging, set one of the following environment variables:

### Option 1: Connection String (Recommended)
```bash
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=your-key;IngestionEndpoint=https://your-region.in.applicationinsights.azure.com/;LiveEndpoint=https://your-region.livediagnostics.monitor.azure.com/"
```

### Option 2: Instrumentation Key (Legacy)
```bash
APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### Alternative Environment Variable Names
The logger also supports these alternative environment variable names:
- `AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING`
- `AZURE_APPLICATION_INSIGHTS_INSTRUMENTATION_KEY`

## Configuration

### Default Configuration
The logger is pre-configured with:
- **Log Level**: `info`
- **Console Transport**: Always enabled with colorized output
- **File Transport**: Daily rotating files in `../../../logs/` directory
- **Azure Transport**: Enabled automatically when environment variables are set

### Custom Logger Instance

```typescript
import { createLoggerInstance } from '@slfcp/logger';

const customLogger = createLoggerInstance();
```

### Custom Azure Transport

```typescript
import { createAzureTransport, AzureTransportOptions } from '@slfcp/logger';
import winston from 'winston';

const azureOptions: AzureTransportOptions = {
  connectionString: 'your-connection-string',
  level: 'warn', // Only log warnings and errors to Azure
  silent: false
};

const azureTransport = createAzureTransport(azureOptions);

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    ...(azureTransport ? [azureTransport] : [])
  ]
});
```

## Azure Application Insights Setup Guide

1. **Create Application Insights Resource**:
   - Go to Azure Portal
   - Create a new Application Insights resource
   - Copy the Connection String from the Overview page

2. **Set Environment Variable**:
   ```bash
   # In your .env file or environment
   APPLICATIONINSIGHTS_CONNECTION_STRING="your-connection-string-here"
   ```

3. **Verify Logging**:
   - Run your application
   - Check the Azure Portal > Application Insights > Logs
   - Look for your log entries in the `traces` table

## Log Levels

The logger supports standard Winston log levels:
- `error`: Error messages
- `warn`: Warning messages  
- `info`: Informational messages
- `http`: HTTP request logs
- `verbose`: Verbose output
- `debug`: Debug messages
- `silly`: Very detailed debug information

## File Structure

```
logs/
├── application-2024-01-15.log
├── application-2024-01-16.log
└── ...
```

Log files are automatically rotated daily and retained for 14 days.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Azure Application Insights connection string (preferred) | `InstrumentationKey=abc123...` |
| `APPINSIGHTS_INSTRUMENTATIONKEY` | Azure Application Insights instrumentation key (legacy) | `abc123-def456-ghi789` |
| `AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING` | Alternative name for connection string | Same as above |
| `AZURE_APPLICATION_INSIGHTS_INSTRUMENTATION_KEY` | Alternative name for instrumentation key | Same as above |

## Troubleshooting

### Azure Transport Not Working
1. Verify your connection string or instrumentation key is correct
2. Check that the environment variable is properly set
3. Look for warning messages in the console output
4. Ensure your Azure Application Insights resource is active

### Missing Logs in Azure
- It may take a few minutes for logs to appear in Azure Portal
- Check the `traces` table in Application Insights Logs
- Verify your log level settings

### Build Errors
If you encounter TypeScript errors, ensure you have the latest version of the package and that your TypeScript configuration includes the logger types.

## Dependencies

- `winston`: Core logging functionality
- `winston-daily-rotate-file`: File rotation support
- `winston-azure-application-insights`: Azure integration
- `applicationinsights`: Azure Application Insights SDK