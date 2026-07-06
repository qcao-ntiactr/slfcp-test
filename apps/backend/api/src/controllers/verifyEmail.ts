import { Request, Response } from 'express';

import { verifyEmailToken } from '../services/verifyEmail.js';
import { logError, OperationType } from '../utils/structuredLogger.js';

/**
 * Verifies an email using a token from query parameters
 * @param req - Express request object with token in query
 * @param res - Express response object
 * @returns Promise<void>
 */
export const verifyEmail = async (
  req: Request<unknown, unknown, unknown, { token?: string }>,
  res: Response
): Promise<void> => {
  const token = req.query.token;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  try {
    const result = await verifyEmailToken(token);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.status(200).json({ message: result.message });
  } catch (error) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError('Error in verifyEmail', error as Error, {
      operation: 'verifyEmail',
      component: 'verify_email',
      operationType: OperationType.HTTP_REQUEST,
      httpStatusCode: 500,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
