import nodemailer from 'nodemailer';
import logger from '@slfcp/logger';

export interface EmailConfig {
  host: string;
  port: number;
  secure: number;
  from?: string;
  user?: string;
  password?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  enabled?: number;
}

export interface EmailOptions {
  address: {
    to?: string;
    cc?: string;
    bcc?: string;
  };
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Creates a configured email sender using Nodemailer.
 *
 * @param {EmailConfig} config - SMTP server config
 * @returns {(opts: EmailOptions) => Promise<void>}
 */
export function createEmailService(config: EmailConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    ...(config.from && { from: config.from }),
    auth: {
      ...(config.user && { user: config.user }),
      ...(config.password && { pass: config.password }),
    },
    secure: config.secure == 1,
    tls: {
      rejectUnauthorized: false, // optional: useful for self-signed certs
    },
  });

  return async function sendEmail(emailOptions: EmailOptions): Promise<void> {
    if (process.env.LOGGING_VERBOSE === 'true') {
      logger.info(emailOptions);
    }
    if (config.enabled !== 1) return;
    const info = await transporter.sendMail({
      from: transporter.options.from || '',
      to: emailOptions.address?.to + ';' + (config.to || ''),
      cc: emailOptions.address?.cc + ';' + (config.cc || ''),
      bcc: emailOptions.address?.bcc + ';' + (config.bcc || ''),
      subject: emailOptions.subject,
      text: emailOptions.text,
      html: emailOptions.html || '',
    });
    if (process.env.LOGGING_VERBOSE === 'true') {
      logger.info(`📨 Email sent: ${info.messageId}`);
    }
  };
}
