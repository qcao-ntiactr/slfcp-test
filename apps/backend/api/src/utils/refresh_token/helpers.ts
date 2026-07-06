import crypto from 'crypto';

import bcrypt from 'bcryptjs'; // or argon2 if you prefer

// Generate a raw token for the client
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

// Hash before saving to DB
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

// Compare raw token to hashed one
export async function verifyToken(
  token: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
