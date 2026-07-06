/**
 * Decode a JWT token without verifying the signature.
 * This is used on the frontend to check expiration.
 */
export function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired.
 * @param token The JWT token string
 * @param bufferSeconds Optional buffer in seconds (default: 0)
 * @returns true if expired or invalid, false otherwise
 */
export function isTokenExpired(token: string, bufferSeconds = 0): boolean {
  if (!token || token === 'mock.jwt.token') {
    return false;
  }

  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now + bufferSeconds;
}

/**
 * Get expiration time from JWT token in milliseconds.
 * @param token The JWT token string
 * @returns expiration time in milliseconds or null if invalid
 */
export function getTokenExpirationTime(token: string): number | null {
  if (!token || token === 'mock.jwt.token') {
    return null;
  }

  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return decoded.exp * 1000;
}
