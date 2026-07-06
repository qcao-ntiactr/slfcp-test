import path from 'path';

import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const parseBooleanEnvFlag = (value: string | undefined): boolean =>
  value === 'true';

export const port = process.env.PORT || 3000;
export const azureBlobStorageConnectionString =
  process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING || '';
export const azureBlobContainerName =
  process.env.CONTAINER_NAME || 'slfcp-uploads';
export const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
export const emailServer = process.env.EMAIL_SERVER;
export const emailPort = parseInt(process.env.EMAIL_PORT);
export const emailFrom = process.env.EMAIL_FROM;
export const emailUser = process.env.EMAIL_USER;
export const emailPassword = process.env.EMAIL_PASSWORD;
export const emailSecure = parseInt(process.env.EMAIL_SECURE) || 0;
export const emailTo = process.env.EMAIL_TO;
export const emailCC = process.env.EMAIL_CC;
export const emailBCC = process.env.EMAIL_BCC;
export const emailEnabled = parseInt(process.env.EMAIL_ENABLED) || 0;
export const azureWorkflowUrl = process.env.AZURE_WORKFLOW_URL;
export const ntiaAutoApprovalUserId = process.env.NTIA_AUTO_APPROVAL_USER_ID;
export const applicationInsightsConnectionString =
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
export const dashboardLiveDataEnabled = parseBooleanEnvFlag(
  process.env.DASHBOARD_LIVE_DATA_ENABLED
);

// Authentication Configuration
export const authMode = process.env.AUTH_MODE;
export const isTestMode =
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
export const jwtSecret =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production-for-security';

// Token Expiration Configuration (secure defaults - short lived)
export const accessTokenExpiresIn = parseInt(
  process.env.ACCESS_TOKEN_EXPIRES_IN || '900',
  10
); // 15 minutes
export const refreshTokenExpiresIn = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES_IN || '86400',
  10
); // 24 hours

// Entra ID Configuration
export const entraTenantId = process.env.ENTRA_TENANT_ID || '';
export const entraClientId = process.env.ENTRA_CLIENT_ID || '';
export const entraClientSecret = process.env.ENTRA_CLIENT_SECRET || '';
export const entraRedirectUri =
  process.env.ENTRA_REDIRECT_URI || `${frontendUrl}/auth/callback`;
export const entraJwksUri = process.env.ENTRA_JWKS_URI || '';

// Login.gov Configuration
export const loginGovClientId = process.env.LOGIN_GOV_CLIENT_ID || '';
export const loginGovPrivateKey = process.env.LOGIN_GOV_PRIVATE_KEY
  ? process.env.LOGIN_GOV_PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';
export const loginGovRedirectUri =
  process.env.LOGIN_GOV_REDIRECT_URI || `${frontendUrl}/auth/callback`;
export const loginGovTokenEndpoint =
  process.env.LOGIN_GOV_TOKEN_ENDPOINT ||
  'https://secure.login.gov/api/openid_connect/token';
export const loginGovUserinfoEndpoint =
  process.env.LOGIN_GOV_USERINFO_ENDPOINT ||
  'https://secure.login.gov/api/openid_connect/userinfo';
export const loginGovJwksUri =
  process.env.LOGIN_GOV_JWKS_URI ||
  'https://secure.login.gov/api/openid_connect/certs';
export const loginGovEndSessionEndpoint =
  process.env.LOGIN_GOV_END_SESSION_ENDPOINT ||
  'https://secure.login.gov/openid_connect/logout';
export const loginGovPostLogoutRedirectUri =
  process.env.LOGIN_GOV_POST_LOGOUT_REDIRECT_URI || frontendUrl;
// For production, use these endpoints instead:
// TOKEN: https://secure.login.gov/api/openid_connect/token
// USERINFO: https://secure.login.gov/api/openid_connect/userinfo
// JWKS: https://secure.login.gov/api/openid_connect/certs
// END_SESSION: https://secure.login.gov/openid_connect/logout

// Rate Limiter Configuration (in milliseconds for windowMs, requests for max)
export const authRateLimiterWindowMs = parseInt(
  process.env.AUTH_RATE_LIMITER_WINDOW_MS || '900000',
  10
); // 15 minutes
export const authRateLimiterMax = parseInt(
  process.env.AUTH_RATE_LIMITER_MAX || '10',
  10
);
export const strictAuthRateLimiterWindowMs = parseInt(
  process.env.STRICT_AUTH_RATE_LIMITER_WINDOW_MS || '900000',
  10
); // 15 minutes
export const strictAuthRateLimiterMax = parseInt(
  process.env.STRICT_AUTH_RATE_LIMITER_MAX || '20',
  10
);
export const refreshTokenRateLimiterWindowMs = parseInt(
  process.env.REFRESH_TOKEN_RATE_LIMITER_WINDOW_MS || '900000',
  10
); // 15 minutes
export const refreshTokenRateLimiterMax = parseInt(
  process.env.REFRESH_TOKEN_RATE_LIMITER_MAX || '100',
  10
);
export const generalRateLimiterWindowMs = parseInt(
  process.env.GENERAL_RATE_LIMITER_WINDOW_MS || '900000',
  10
); // 15 minutes
export const generalRateLimiterMax = parseInt(
  process.env.GENERAL_RATE_LIMITER_MAX || '100',
  10
);
