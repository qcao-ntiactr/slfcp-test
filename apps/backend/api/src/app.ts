import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { frontendUrl } from './config.js';
import {
  structuredRequestLoggingMiddleware,
  structuredErrorLoggingMiddleware,
} from './middleware/structuredRequestLogging.js';

import routers from './index.js';

/**
 * Creates and configures an Express application with middleware and routes
 * @returns {express.Application} Configured Express application instance
 */
export function createApp(): express.Application {
  const app = express();

  // Trust proxy settings for production environments (Azure App Service, load balancers, etc.)
  // Set to 1 to trust only the first proxy in the X-Forwarded-For chain
  // This is more secure than 'true' and prevents IP spoofing for rate limiting
  // See: https://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', 1);

  // Add structured request logging middleware early in the chain
  app.use(structuredRequestLoggingMiddleware);

  app.use(
    cors({
      origin: frontendUrl,
      credentials: true, // Allow cookies to be sent with requests,
    })
  );

  app.use(morgan('tiny'));
  app.use(cookieParser()); // Parse cookies from requests
  app.use(bodyParser.json());

  app.use('/', routers);

  // Add structured error logging middleware at the end
  app.use(structuredErrorLoggingMiddleware);

  return app;
}
