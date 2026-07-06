import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

import {
  loginGovClientId,
  loginGovPrivateKey,
  loginGovRedirectUri,
  loginGovTokenEndpoint,
  loginGovUserinfoEndpoint,
  loginGovJwksUri,
} from '../config.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { Role } from '../middleware/roles.js';
import { logError, logWithOperation } from '../utils/structuredLogger.js';

interface LoginGovTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface LoginGovUserProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
  };
  birthdate?: string;
  [key: string]: unknown;
}

interface DecodedToken {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  role: Role;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

class LoginGovAuthService {
  private jwksClientInstance: jwksClient.JwksClient | null = null;

  constructor() {
    if (loginGovClientId && loginGovPrivateKey) {
      this.initializeJwksClient();
    }
  }

  /**
   * Initializes the JWKS client for token validation
   * @private
   */
  private initializeJwksClient() {
    if (loginGovJwksUri) {
      this.jwksClientInstance = jwksClient({
        jwksUri: loginGovJwksUri,
        requestHeaders: {},
        timeout: 30000,
      });
    }
  }

  /**
   * Creates a signed JWT assertion for private_key_jwt authentication
   * Required by Login.gov for secure token exchange
   * @private
   * @returns Signed JWT token
   */
  private createJwtAssertion(): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: loginGovClientId,
      sub: loginGovClientId,
      aud: loginGovTokenEndpoint,
      jti: `${loginGovClientId}.${now}`,
      exp: now + 60, // 60 seconds expiration
      iat: now,
    };

    if (!loginGovPrivateKey) {
      throw new Error('Login.gov private key not configured');
    }

    return jwt.sign(payload, loginGovPrivateKey, { algorithm: 'RS256' });
  }

  /**
   * Exchanges authorization code for access tokens using private_key_jwt authentication and PKCE
   * @param code - Authorization code from Login.gov
   * @param codeVerifier - PKCE code_verifier (generated on frontend, matching the code_challenge sent in auth request)
   * @returns Promise resolving to token response
   * @throws Error if exchange fails
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string
  ): Promise<LoginGovTokenResponse> {
    const sanitizeForLogs = (value: string | undefined | null): string => {
      if (!value) return '';
      // Remove line breaks, tabs, and escape chars safely
      return value.replace(/[\r\n\t\u2028\u2029]/g, '');
    };

    try {
      // DEBUG: Log what we received (sanitized)
      logWithOperation(
        'debug',
        '🔍 DEBUG loginGovAuthService.exchangeCodeForTokens:',
        null,
        {
          code: sanitizeForLogs(code)?.substring(0, 20) + '...',
          codeVerifier: sanitizeForLogs(codeVerifier)?.substring(0, 20) + '...',
          codeVerifierPresent: !!codeVerifier,
          codeVerifierLength: codeVerifier
            ? sanitizeForLogs(String(codeVerifier.length))
            : 'N/A',
        }
      );
      const assertion = this.createJwtAssertion();

      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append(
        'client_assertion_type',
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
      );
      params.append('client_assertion', assertion);
      params.append('redirect_uri', loginGovRedirectUri!);

      // Add PKCE code_verifier if provided (required if code_challenge was sent in authorization request)
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }

      // DEBUG: Log what we're sending to Login.gov
      logWithOperation(
        'debug',
        '🔍 DEBUG: URLSearchParams keys being sent to Login.gov:',
        null,
        {
          params: Array.from(params.keys()),
          code_verifier_in_params: params.has('code_verifier'),
        }
      );

      // Log the token exchange request details (sanitize sensitive data)
      logWithOperation(
        'info',
        'Exchanging authorization code for tokens',
        null,
        {
          tokenEndpoint: loginGovTokenEndpoint,
          redirectUri: loginGovRedirectUri,
          clientId: loginGovClientId,
          codeLength: code.length,
          codePreview: code.substring(0, 20) + '...',
          codeVerifierPresent: !!codeVerifier,
          codeVerifierLength: codeVerifier?.length || 0,
          grantType: 'authorization_code',
        }
      );

      const response = await axios.post(loginGovTokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        access_token: response.data.access_token,
        id_token: response.data.id_token || '',
        expires_in: response.data.expires_in || 3600,
        token_type: response.data.token_type || 'Bearer',
      };
    } catch (error) {
      // Extract detailed error information from axios error
      let errorDetails = sanitizeForLogs(String(error));
      let loginGovStatusCode = null;
      let loginGovResponseData = null;

      if (error && typeof error === 'object') {
        const axiosError = error as Error & {
          response?: { status: number; data: unknown };
        };
        if (axiosError.response?.data) {
          loginGovResponseData = axiosError.response.data;
          errorDetails = `Login.gov error: ${JSON.stringify(sanitizeForLogs(JSON.stringify(axiosError.response.data)))}`;
        }
        if (axiosError.response?.status) {
          loginGovStatusCode = axiosError.response.status;
          errorDetails += ` | Status: ${axiosError.response.status}`;
        }
      }

      logError('Error exchanging code for tokens', error as Error, {
        operation: 'exchangeCodeForTokens',
        component: 'loginGovAuth_services',
        additionalData: {
          error: errorDetails,
          loginGovStatusCode,
          loginGovResponseData: sanitizeForLogs(
            JSON.stringify(loginGovResponseData)
          ),
          redirectUri: loginGovRedirectUri,
          clientId: loginGovClientId,
          tokenEndpoint: loginGovTokenEndpoint,
        },
      });
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Validates a Login.gov JWT token
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
            audience: loginGovClientId,
            issuer: 'https://secure.login.gov',
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
   * Gets user profile from Login.gov UserInfo endpoint
   * @param accessToken - Access token for UserInfo API
   * @returns Promise resolving to user profile data
   * @throws Error if profile fetch fails
   */
  async getUserProfile(accessToken: string): Promise<LoginGovUserProfile> {
    try {
      const response = await axios.get(loginGovUserinfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userProfile: LoginGovUserProfile = {
        sub: response.data.sub,
        email: response.data.email,
        email_verified: response.data.email_verified,
        given_name: response.data.given_name,
        family_name: response.data.family_name,
        phone_number: response.data.phone_number,
        phone_number_verified: response.data.phone_number_verified,
        address: response.data.address,
        birthdate: response.data.birthdate,
      };

      logWithOperation('info', 'Login.gov user profile retrieved', null, {
        userId: userProfile.sub,
        email: userProfile.email,
      });

      return userProfile;
    } catch (error) {
      logError('Error fetching user profile', error as Error, {
        operation: 'getUserProfile',
        component: 'loginGovAuth_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Failed to fetch user profile from Login.gov');
    }
  }

  /**
   * Checks if Login.gov service is properly configured
   * @returns True if configured, false otherwise
   */
  isConfigured(): boolean {
    return !!(
      loginGovClientId &&
      loginGovPrivateKey &&
      this.jwksClientInstance
    );
  }
}

export const loginGovAuthService = new LoginGovAuthService();
