import jwt from 'jsonwebtoken';

import { jwtSecret } from '../config.js';
import { Role } from '../middleware/roles.js';

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export class JwtService {
  /**
   * Creates a JWT token with the provided payload
   * @param payload - Token payload without iat and exp fields
   * @param expiresInSeconds - Token expiration time in seconds (default: 900 seconds)
   * @returns Signed JWT token string
   */
  static createToken(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
    expiresInSeconds: number = 900 // 15 minutes default
  ): string {
    const tokenPayload: JwtPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };

    return jwt.sign(tokenPayload, jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Gets the expiration time of a JWT token
   * @param token - JWT token string
   * @returns Expiration time in milliseconds or null if invalid
   */
  static getTokenExpiration(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  /**
   * Verifies and decodes a JWT token
   * @param token - JWT token string to verify
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or verification fails
   */
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      return decoded as JwtPayload;
    } catch (error) {
      throw new Error(
        `Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
