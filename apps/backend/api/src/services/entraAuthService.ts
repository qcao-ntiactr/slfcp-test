import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

import {
  entraTenantId,
  entraClientId,
  entraClientSecret,
  entraRedirectUri,
  entraJwksUri,
} from '../config.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { Role } from '../middleware/roles.js';
import { logError, logWithOperation } from '../utils/structuredLogger.js';

interface EntraTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface EntraUserProfile {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName?: string;
  groups?: string[];
}

interface DecodedToken {
  sub?: string;
  oid?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  role: Role;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

interface GraphGroup {
  displayName: string;
  id: string;
  [key: string]: unknown;
}

class EntraAuthService {
  private msalInstance: ConfidentialClientApplication | null = null;
  private jwksClientInstance: jwksClient.JwksClient | null = null;

  constructor() {
    if (entraTenantId && entraClientId) {
      if (entraClientSecret) {
        this.initializeMsal();
      }
      this.initializeJwksClient();
    }
  }

  /**
   * Initializes the MSAL instance for Entra ID authentication
   * @private
   */
  private initializeMsal() {
    const clientConfig = {
      auth: {
        clientId: entraClientId!,
        clientSecret: entraClientSecret!,
        authority: `https://login.microsoftonline.com/${entraTenantId}`,
      },
    };

    this.msalInstance = new ConfidentialClientApplication(clientConfig);
  }

  /**
   * Initializes the JWKS client for token validation
   * @private
   */
  private initializeJwksClient() {
    if (entraJwksUri) {
      this.jwksClientInstance = jwksClient({
        jwksUri: entraJwksUri,
        requestHeaders: {},
        timeout: 30000,
      });
    }
  }

  /**
   * Exchanges authorization code for access tokens
   * @param code - Authorization code from Entra ID
   * @returns Promise resolving to token response
   * @throws Error if exchange fails
   */
  async exchangeCodeForTokens(code: string): Promise<EntraTokenResponse> {
    if (!this.msalInstance) {
      throw new Error('Entra ID not configured');
    }

    const clientCredentialRequest = {
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      code,
      redirectUri: entraRedirectUri!,
    };

    try {
      const response = await this.msalInstance.acquireTokenByCode(
        clientCredentialRequest
      );

      return {
        access_token: response.accessToken,
        refresh_token: '', // MSAL handles refresh tokens internally
        id_token: response.idToken || '',
        expires_in: response.expiresOn
          ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000)
          : 3600,
        token_type: 'Bearer',
      };
    } catch (error) {
      logError('Error exchanging code for tokens', error as Error, {
        operation: 'exchangeCodeForTokens',
        component: 'entraAuth_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Validates an Entra ID JWT token
   * @param token - JWT token to validate
   * @returns Promise resolving to decoded token payload
   * @throws Error if validation fails
   */
  async validateToken(token: string): Promise<DecodedToken> {
    if (!this.jwksClientInstance) {
      throw new Error('JWKS client not configured');
    }

    return new Promise((resolve, reject) => {
      // Decode token header to get kid
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        return reject(new Error('Invalid token format'));
      }

      // Get signing key
      this.jwksClientInstance!.getSigningKey(decoded.header.kid, (err, key) => {
        if (err) {
          return reject(err);
        }

        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          return reject(new Error('Unable to get signing key'));
        }

        // Verify token
        jwt.verify(
          token,
          signingKey,
          {
            audience: entraClientId,
            issuer: `https://login.microsoftonline.com/${entraTenantId}/v2.0`,
            algorithms: ['RS256'],
          },
          (verifyErr, payload) => {
            if (verifyErr) {
              return reject(verifyErr);
            }
            if (typeof payload === 'string') {
              return reject(new Error('Invalid token payload'));
            }
            resolve(payload as DecodedToken);
          }
        );
      });
    });
  }

  /**
   * Gets user profile from Microsoft Graph API
   * @param accessToken - Access token for Graph API
   * @returns Promise resolving to user profile data
   * @throws Error if profile fetch fails
   */
  async getUserProfile(accessToken: string): Promise<EntraUserProfile> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Try to get user's groups (may fail due to permissions)
      let groups: string[] = [];
      try {
        const groupsResponse = await axios.get(
          'https://graph.microsoft.com/v1.0/me/memberOf',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        groups =
          groupsResponse.data.value
            ?.map((group: GraphGroup) => group.id)
            .filter(Boolean) || [];
      } catch (groupError) {
        logWithOperation('warn', 'Could not fetch user groups', null, {
          status: groupError.response?.status,
          statusText: groupError.response?.statusText,
        });
      }

      const userProfile = {
        id: response.data.id,
        displayName: response.data.displayName,
        mail: response.data.mail,
        userPrincipalName: response.data.userPrincipalName,
        groups,
      };

      // Log when mail is null to help with debugging
      if (!userProfile.mail) {
        logWithOperation(
          'warn',
          'User mail field is null, userPrincipalName available as fallback',
          null,
          {
            userId: userProfile.id,
            displayName: userProfile.displayName,
            userPrincipalName: userProfile.userPrincipalName,
          }
        );
      }

      return userProfile;
    } catch (error) {
      logError('Error fetching user profile', error as Error, {
        operation: 'getUserProfile',
        component: 'entraAuth_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Checks if Entra ID service is properly configured
   * @returns True if configured, false otherwise
   */
  isConfigured(): boolean {
    return !!(entraTenantId && entraClientId && this.jwksClientInstance);
  }
}

export const entraAuthService = new EntraAuthService();
