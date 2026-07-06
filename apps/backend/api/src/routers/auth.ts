import express, { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import {
  logError,
  logWithOperation,
  logAuthEvent,
} from '../utils/structuredLogger.js';
import {
  authMode,
  accessTokenExpiresIn,
  refreshTokenExpiresIn,
  loginGovEndSessionEndpoint,
  loginGovClientId,
  loginGovRedirectUri,
  loginGovPostLogoutRedirectUri,
} from '../config.js';
import { entraAuthService } from '../services/entraAuthService.js';
import { loginGovAuthService } from '../services/loginGovAuthService.js';
import { extractUserRole } from '../middleware/roles.js';
import { JwtService } from '../services/jwtService.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import {
  generateRefreshToken,
  hashToken,
  verifyToken,
} from '../utils/refresh_token/helpers.js';
import {
  authRateLimiter,
  strictAuthRateLimiter,
  refreshTokenRateLimiter,
  generalRateLimiter,
} from '../middleware/rateLimiter.js';
import { components } from '../types/requests.js';

export type TokenResponse = components['schemas']['TokenResponse'];
export type UserObject = components['schemas']['UserObject'];
export type UserProfileResponse = components['schemas']['UserProfileResponse'];
export type LogoutResponse = components['schemas']['LogoutResponse'];
export type DebugUserResponse = components['schemas']['DebugUserResponse'];
export type ConfigResponse = components['schemas']['ConfigResponse'];

const router: express.Router = Router();
const prisma = new PrismaClient();

/**
 * Securely check if mock authentication mode is enabled
 * This prevents user-controlled bypass of security checks
 * @returns {boolean} True if mock mode is enabled via environment variable
 */
function isMockAuthEnabled(): boolean {
  // Only check environment variable, never user input
  return process.env.AUTH_MODE === 'mock';
}

/**
 * Clean up expired refresh tokens from the database
 */
async function cleanupExpiredTokens(): Promise<void> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    if (result.count > 0) {
      logWithOperation(
        'info',
        `Cleaned up ${result.count} expired refresh tokens`
      );
    }
  } catch (error) {
    logError('Failed to cleanup expired refresh tokens', error as Error, {
      component: 'auth_routers',
      additionalData: {
        error: sanitizeForLogs(String(error)),
      },
    });
  }
}

function mapRoleToFrontend(backendRole: string): string {
  switch (backendRole) {
    case 'NTIA':
      return 'NTIA';
    case 'FEDERAL_AGENCY':
      return 'Federal';
    case 'COMMERCIAL':
      return 'Commercial';
    default:
      return 'Commercial';
  }
}

/**
 * POST /auth/token - Exchange authorization code for tokens
 * Rate limited to prevent brute force attacks
 *
 * Security: Rate limiting applied via authRateLimiter middleware (10 requests per 15 minutes)
 * CodeQL: This endpoint is protected against brute force attacks
 */
// lgtm[js/missing-rate-limiting]
router.post('/token', authRateLimiter, async (req: Request, res: Response) => {
  try {
    logAuthEvent(
      'Token exchange request received',
      'token_exchange_start',
      true,
      undefined,
      undefined,
      { rateLimiterPassed: true },
      req
    );

    const rawCode = req.body?.code;
    const code_verifier = req.body?.code_verifier;

    const code =
      typeof rawCode === 'string' && rawCode.trim().length > 0
        ? rawCode.trim()
        : null;

    const codePresent = !!code;
    const codeVerifierPresent = !!code_verifier;

    logWithOperation(
      'debug',
      '🔍 DEBUG: /auth/token POST request body keys:',
      req,
      {
        body: Object.keys(req.body),
      }
    );
    logWithOperation('debug', '🔍 DEBUG: code_verifier value:', req, {
      // Remove line breaks, tabs, and escape chars safely
      code_verifier: String(code_verifier).replace(/[\r\n\t\u2028\u2029]/g, ''),
      code_verifier_typeof: typeof code_verifier,
      code_verifier_present: !!code_verifier,
    });

    logAuthEvent(
      'Authorization code validation',
      'code_validation',
      codePresent && codeVerifierPresent,
      undefined,
      codePresent ? undefined : 'No code provided',
      {
        codePresent,
        codeLength: code?.length || 0,
        codePreview: code ? code.substring(0, 20) + '...' : 'N/A',
        codeVerifierPresent,
        codeVerifierLength: code_verifier?.length || 0,
      },
      req
    );

    if (!code) {
      logAuthEvent(
        'Missing authorization code',
        'token_exchange_failed',
        false,
        undefined,
        'Code not provided',
        { statusCode: 400 },
        req
      );
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Determine which authentication service to use
    const isEntraConfigured = entraAuthService.isConfigured();
    const isLoginGovConfigured = loginGovAuthService.isConfigured();

    if (authMode === 'login-gov' && isLoginGovConfigured && !code_verifier) {
      return res.status(400).json({ error: 'Code verifier is required' });
    }

    logAuthEvent(
      'Auth mode check',
      'auth_mode_check',
      true,
      undefined,
      undefined,
      { authMode },
      req
    );
    // Use secure function to check mock mode (prevents user-controlled bypass)
    if (isMockAuthEnabled()) {
      const resToken: TokenResponse = {
        access_token: 'mock.jwt.token',
        refresh_token: 'mock.refresh.token',
        token_type: 'Bearer',
        expires_in: accessTokenExpiresIn,
      };

      return res.json(resToken);
    }

    if (!isEntraConfigured && !isLoginGovConfigured) {
      return res
        .status(500)
        .json({ error: 'No authentication provider configured' });
    }

    let tokens;
    let userProfile;

    // Use the configured auth service based on AUTH_MODE
    if (authMode === 'login-gov' && isLoginGovConfigured) {
      tokens = await loginGovAuthService.exchangeCodeForTokens(
        code,
        code_verifier
      );
      userProfile = await loginGovAuthService.getUserProfile(
        tokens.access_token
      );
    } else if (isEntraConfigured) {
      tokens = await entraAuthService.exchangeCodeForTokens(code);
      userProfile = await entraAuthService.getUserProfile(tokens.access_token);
    } else {
      return res
        .status(500)
        .json({ error: 'Authentication provider mismatch' });
    }

    logWithOperation('info', 'User profile retrieved', req, {
      userProfile: sanitizeForLogs(JSON.stringify(userProfile)),
    });

    // Extract identifiers based on auth provider
    const externalId =
      authMode === 'login-gov' ? userProfile.email : userProfile.id;
    const email =
      authMode === 'login-gov' ? userProfile.email : userProfile.mail;
    const emailFallback =
      authMode === 'login-gov' ? undefined : userProfile.userPrincipalName;

    let user = await prisma.user.findUnique({
      where: { external_id: externalId },
      include: { entity: true },
    });

    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: { entity: true },
      });
    }

    // If still not found and using Entra, try userPrincipalName as fallback
    if (!user && emailFallback) {
      user = await prisma.user.findUnique({
        where: { email: emailFallback },
        include: { entity: true },
      });
    }

    if (!user) {
      const debugInfo =
        authMode === 'login-gov'
          ? {
              loginGovSub: userProfile.sub,
              email: userProfile.email,
              emailVerified: userProfile.email_verified,
            }
          : {
              microsoftUserId: userProfile.id,
              displayName: userProfile.displayName,
              email: userProfile.mail,
              userPrincipalName: userProfile.userPrincipalName,
              mailIsNull: userProfile.mail === null,
            };

      return res.status(403).json({
        error: 'User not found in system',
        message: 'Please contact your administrator to set up your account',
        debug: debugInfo,
      });
    }

    // Extract role from Microsoft groups if available, otherwise use entity type
    const backendRole = userProfile.groups
      ? extractUserRole(userProfile.groups)
      : user.entity?.type || 'unknown';
    const frontendRole = mapRoleToFrontend(backendRole);

    const jwtToken = JwtService.createToken(
      {
        sub: user.external_id,
        email: user.email,
        name: user.name,
        role: backendRole,
      },
      accessTokenExpiresIn
    );

    const rawRefreshToken = generateRefreshToken();
    const hashedRefreshToken = await hashToken(rawRefreshToken);

    await prisma.refreshToken.create({
      data: {
        user_external_id: user.external_id,
        tokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
      },
    });

    logAuthEvent(
      'Token exchange successful',
      'token_exchange_success',
      true,
      user.external_id,
      undefined,
      { userId: user.external_id, email: user.email },
      req
    );

    const userObject: UserObject = {
      id: user.external_id,
      displayName: user.name,
      email: user.email,
      role: frontendRole,
      tenantId: 'default',
      federalAgencyId: user.entity?.id?.toString(),
      federalAgencyAbbr: user.entity?.abbreviation,
      canConcur: user.can_concur,
      isEntityActive: user.entity?.active ?? true,
    };

    const resToken: TokenResponse = {
      access_token: jwtToken,
      refresh_token: rawRefreshToken,
      id_token: tokens.id_token,
      expires_in: accessTokenExpiresIn,
      refresh_token_expires_in: refreshTokenExpiresIn,
      token_type: 'Bearer',
      user: userObject,
    };

    res.json(resToken);
  } catch (error) {
    logAuthEvent(
      'Token exchange failed',
      'token_exchange_error',
      false,
      undefined,
      String(error),
      { error: sanitizeForLogs(String(error)) },
      req
    );
    logError('Token exchange error', error as Error, {
      component: 'auth_routers',
      additionalData: {
        error: sanitizeForLogs(String(error)),
      },
    });
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

/**
 * POST /auth/refresh - Refresh access token by issuing new JWT token
 * Rate limited to prevent token abuse
 *
 * Security: Rate limiting applied via refreshTokenRateLimiter middleware (100 requests per 15 minutes)
 * Uses a more permissive limit than login/logout since this requires a valid refresh token (already authenticated)
 * CodeQL: This endpoint is protected against brute force attacks
 */
// lgtm[js/missing-rate-limiting]
router.post(
  '/refresh',
  refreshTokenRateLimiter,
  async (req: Request, res: Response) => {
    try {
      // Extract refresh token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Refresh token missing' });
      }

      const refreshToken = authHeader.split(' ')[1];

      // Use secure function to check mock mode (prevents user-controlled bypass)
      if (isMockAuthEnabled()) {
        const resToken: TokenResponse = {
          access_token: 'mock.jwt.token',
          refresh_token: 'mock.refresh.token',
          token_type: 'Bearer',
          expires_in: accessTokenExpiresIn,
          refresh_token_expires_in: refreshTokenExpiresIn,
        };

        return res.json(resToken);
      }

      // Clean up expired tokens first
      await cleanupExpiredTokens();

      // --- Verify refresh token in DB ---
      // Get all non-expired tokens (we need to iterate since tokens are hashed)
      const storedTokens = await prisma.refreshToken.findMany({
        where: { expiresAt: { gt: new Date() } },
      });

      let stored: (typeof storedTokens)[number] | null = null;
      for (const t of storedTokens) {
        const match = await verifyToken(refreshToken, t.tokenHash);
        if (match) {
          stored = t;
          break;
        }
      }

      if (!stored) {
        return res
          .status(401)
          .json({ error: 'Invalid or expired refresh token' });
      }

      // --- Load user ---
      const user = await prisma.user.findUnique({
        where: { external_id: stored.user_external_id },
        include: { entity: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // --- Rotate refresh token ---
      const newRawRefreshToken = generateRefreshToken(); // string generated from randomly generated bytes
      const newHashed = await hashToken(newRawRefreshToken); // hashed for secure database storage

      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: {
          tokenHash: newHashed,
          expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
        },
      });

      // This is the entity type the user belongs to
      // used for mapping access in the backend (uses SNAKE_CASE)
      const backendRole = user.entity?.type || 'unknown';
      // This is the label used in the frontend (uses Title Case)
      const frontendRole = mapRoleToFrontend(backendRole);

      const newJwtToken = JwtService.createToken(
        {
          sub: user.external_id,
          email: user.email,
          name: user.name,
          role: backendRole,
        },
        accessTokenExpiresIn
      );

      logWithOperation('info', '🔄 JWT TOKEN REFRESHED SUCCESSFULLY! 🔄', req, {
        userId: user.external_id,
        email: user.email,
        timestamp: new Date().toISOString(),
        expiresIn: `${accessTokenExpiresIn}s`,
      });

      // --- Respond with new JWT, new refresh token, and consistent user object ---
      const userObject: UserObject = {
        id: user.external_id,
        displayName: user.name,
        email: user.email,
        role: frontendRole,
        tenantId: 'default',
        federalAgencyId: user.entity?.id?.toString(),
        federalAgencyAbbr: user.entity?.abbreviation,
        canConcur: user.can_concur,
        isEntityActive: user.entity?.active ?? true,
      };

      const resToken: TokenResponse = {
        access_token: newJwtToken,
        refresh_token: newRawRefreshToken,
        expires_in: accessTokenExpiresIn,
        refresh_token_expires_in: refreshTokenExpiresIn,
        token_type: 'Bearer',
        user: userObject,
      };

      res.json(resToken);
    } catch (error) {
      logError('Token refresh error', error as Error, {
        component: 'auth_routers',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }
);

/**
 * GET /auth/user - Get current user profile
 */
router.get('/user', generalRateLimiter, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    // Use secure function to check mock mode (prevents user-controlled bypass)
    if (isMockAuthEnabled()) {
      const resUserProfile: UserProfileResponse = {
        id: 'mock-user-id',
        name: 'Mock User',
        email: 'mock@example.com',
        isEntityActive: true,
      };

      return res.json(resUserProfile);
    }

    // Determine which authentication service to use
    const isEntraConfigured = entraAuthService.isConfigured();
    const isLoginGovConfigured = loginGovAuthService.isConfigured();

    if (!isEntraConfigured && !isLoginGovConfigured) {
      return res
        .status(500)
        .json({ error: 'No authentication provider configured' });
    }

    let userProfile;

    if (authMode === 'login-gov' && isLoginGovConfigured) {
      userProfile = await loginGovAuthService.getUserProfile(token);
    } else if (isEntraConfigured) {
      userProfile = await entraAuthService.getUserProfile(token);
    } else {
      return res
        .status(500)
        .json({ error: 'Authentication provider mismatch' });
    }

    // Extract identifiers based on auth provider
    const externalId =
      authMode === 'login-gov' ? userProfile.sub : userProfile.id;
    const email =
      authMode === 'login-gov' ? userProfile.email : userProfile.mail;
    const emailFallback =
      authMode === 'login-gov' ? undefined : userProfile.userPrincipalName;

    let user = await prisma.user.findUnique({
      where: { external_id: externalId },
      include: { entity: true },
    });

    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: { entity: true },
      });
    }

    // If still not found and using Entra, try userPrincipalName as fallback
    if (!user && emailFallback) {
      user = await prisma.user.findUnique({
        where: { email: emailFallback },
        include: { entity: true },
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found in system' });
    }
    const resUserProfile: UserProfileResponse = {
      id: user.external_id,
      name: user.name,
      email: user.email,
      entity: user.entity
        ? {
            ...user.entity,
            inquiriesAsEntityA: [],
            inquiriesAsEntityB: [],
          }
        : undefined,
      can_concur: user.can_concur,
      isEntityActive: user.entity?.active ?? true,
      auth_profile: userProfile,
    };

    res.json(resUserProfile);
  } catch (error) {
    logError('Get user error', error as Error, {
      component: 'auth_routers',
      additionalData: {
        error: sanitizeForLogs(String(error)),
      },
    });
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * POST /auth/logout - Logout and revoke refresh token
 * Rate limited to prevent abuse
 */
router.post(
  '/logout',
  strictAuthRateLimiter,
  async (req: Request, res: Response) => {
    try {
      // Extract refresh token from Authorization header or cookies
      let refreshToken: string | null = null;

      // Try Authorization header first (consistent with /refresh endpoint)
      const authHeader = req.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const rawHeaderToken = authHeader.split(' ')[1];
        if (
          typeof rawHeaderToken === 'string' &&
          rawHeaderToken.trim() !== ''
        ) {
          const trimmedHeaderToken = rawHeaderToken.trim();
          if (/^[A-Za-z0-9\-_=.]+$/.test(trimmedHeaderToken)) {
            refreshToken = trimmedHeaderToken;
          }
        }
      } else {
        // Fallback to cookies for backwards compatibility
        const rawToken = req.cookies['refresh_token'];
        if (typeof rawToken === 'string') {
          const trimmedToken = rawToken.trim();
          if (
            /^[A-Za-z0-9\-_=.]+$/.test(trimmedToken) &&
            trimmedToken.length > 10
          ) {
            refreshToken = trimmedToken;
          }
        }
      }

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Clean up expired tokens first
      await cleanupExpiredTokens();

      // Get all non-expired tokens to find the matching one (since tokens are hashed)
      const storedTokens = await prisma.refreshToken.findMany({
        where: { expiresAt: { gt: new Date() } },
      });

      for (const t of storedTokens) {
        const match = await verifyToken(refreshToken, t.tokenHash);
        if (match) {
          await prisma.refreshToken.delete({ where: { id: t.id } });
          break;
        }
      }

      const resLogout: LogoutResponse = {
        message: 'Logged out successfully',
      };

      // For login.gov, provide logout redirect URL
      if (authMode === 'login-gov') {
        const logoutUrl = new URL(loginGovEndSessionEndpoint);
        logoutUrl.searchParams.append('client_id', loginGovClientId);
        logoutUrl.searchParams.append(
          'post_logout_redirect_uri',
          loginGovPostLogoutRedirectUri
        );
        resLogout.logout_redirect_url = logoutUrl.toString();
      }

      res.json(resLogout);
    } catch (error) {
      logError('Logout error', error as Error, {
        component: 'auth_routers',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      res.status(500).json({ error: 'Failed to log out' });
    }
  }
);

/**
 * GET /auth/config - Get authentication configuration for frontend
 */
router.get('/config', (req: Request, res: Response) => {
  const resConfig: ConfigResponse = {
    authMode,
    entraConfigured: entraAuthService.isConfigured(),
    loginGovConfigured: loginGovAuthService.isConfigured(),
  };

  // Add Login.gov config if configured
  if (loginGovAuthService.isConfigured()) {
    resConfig.loginGovClientId = loginGovClientId;
    resConfig.loginGovRedirectUri = loginGovRedirectUri;
    resConfig.loginGovEndSessionEndpoint = loginGovEndSessionEndpoint;
    // Determine auth endpoint based on environment
    const isProduction =
      !process.env.LOGIN_GOV_TOKEN_ENDPOINT?.includes('int.');
    resConfig.loginGovAuthEndpoint = isProduction
      ? 'https://secure.login.gov/openid_connect/authorize'
      : 'https://idp.int.identitysandbox.gov/openid_connect/authorize';
  }

  res.json(resConfig);
});

/**
 * POST /auth/debug-user - Debug endpoint
 */
router.post('/debug-user', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const isEntraConfigured = entraAuthService.isConfigured();
    const isLoginGovConfigured = loginGovAuthService.isConfigured();

    if (!isEntraConfigured && !isLoginGovConfigured) {
      return res
        .status(500)
        .json({ error: 'No authentication provider configured' });
    }

    let userProfile;
    let provider: string;

    if (authMode === 'login-gov' && isLoginGovConfigured) {
      const tokens = await loginGovAuthService.exchangeCodeForTokens(code);
      userProfile = await loginGovAuthService.getUserProfile(
        tokens.access_token
      );
      provider = 'Login.gov';
    } else if (isEntraConfigured) {
      const tokens = await entraAuthService.exchangeCodeForTokens(code);
      userProfile = await entraAuthService.getUserProfile(tokens.access_token);
      provider = 'Entra ID';
    } else {
      return res
        .status(500)
        .json({ error: 'Authentication provider mismatch' });
    }

    const externalId =
      authMode === 'login-gov' ? userProfile.sub : userProfile.id;

    const resUserProfile: UserProfileResponse =
      authMode === 'login-gov'
        ? {
            sub: userProfile.sub,
            email: userProfile.email,
            given_name: userProfile.given_name,
            family_name: userProfile.family_name,
          }
        : {
            id: userProfile.id,
            displayName: userProfile.displayName,
            email: userProfile.mail,
          };

    const resDebugUser: DebugUserResponse = {
      message: `${provider} user profile retrieved successfully`,
      userProfile: resUserProfile,
      instructions: `To add this user to the database, use external_id: "${externalId}"`,
    };

    res.json(resDebugUser);
  } catch (error) {
    logError('Debug user error', error as Error, {
      component: 'auth_routers',
      additionalData: {
        error: sanitizeForLogs(String(error)),
      },
    });
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

export default router;
