import crypto from 'crypto';

import { EmailService } from '../emails/emailService.js';
import { verifyEmailTemplate } from '../emails/emailTemplates.js';
import prisma from '../utils/database.js';

/**
 * Requests email verification by creating a token and sending verification email
 * @param email - Email address to verify
 * @returns Promise<void>
 */
export async function requestEmailVerification(email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.emailVerification.create({
    data: { email, token, expiresAt },
  });

  const link = `http://localhost:3000/verify-email?token=${token}`;

  // For email verification, we only send to the specific email being verified
  // We don't include entity distribution emails since this is for email verification
  EmailService.sendNotification(verifyEmailTemplate, {
    address: { to: `${email}`, cc: '' },
    toName: email,
    bodyParams: [link],
    optional: '',
  });
}

/**
 * Verifies an email token and marks the email as verified
 * @param token - Verification token to validate
 * @returns Promise resolving to success status and message
 */
export async function verifyEmailToken(
  token: string
): Promise<{ success: boolean; message: string }> {
  const record = await prisma.emailVerification.findFirst({
    where: { token },
  });

  if (!record || record.expiresAt < new Date()) {
    return { success: false, message: 'Invalid or expired token' };
  }

  // Update the user to mark them as verified
  await prisma.emailVerification.updateMany({
    where: { email: record.email },
    data: { isVerified: true },
  });

  // Optionally delete the verification token
  // await prisma.emailVerification.deleteMany({ where: { token } });

  return { success: true, message: 'Email verified successfully' };
}

/**
 * For testing only
 */
// (async () => {
//   await requestEmailVerification('aibrahim.ctr@ntia.gov');
// })();
