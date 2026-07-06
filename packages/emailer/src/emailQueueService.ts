import nodemailer from 'nodemailer';
import logger from '@slfcp/logger';

import { EmailConfig, EmailOptions } from './sendEmail.js';

export interface QueueConfig {
  connection: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  queueName?: string;
}

/**
 * EmailQueueService is responsible for managing a queue of email jobs
 * and processing them sequentially.
 */
export class EmailQueueService {
  private queue: EmailOptions[] = [];
  private processing = false;
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      ...(config.from && { from: config.from }),
      auth: {
        ...(config.user && { user: config.user }),
        ...(config.password && { pass: config.password }),
      },
      secure: config.secure === 1,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Adds an email job to the queue and starts processing if not already processing.
   * @param {EmailOptions} emailOptions - The email options to be queued.
   */
  public add(emailOptions: EmailOptions) {
    this.queue.push(emailOptions);
    this.processNext();
  }

  /**
   * Processes the next email job in the queue.
   * This method is called recursively to ensure all queued emails are sent.
   */
  private async processNext() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const emailOptions = this.queue.shift();
    if (!emailOptions) {
      this.processing = false;
      return;
    }

    try {
      if (this.config.enabled !== 1) {
        if (process.env.LOGGING_VERBOSE === 'true') {
          logger.info(emailOptions);
          logger.info(
            'Email sending disabled; skipping email:',
            emailOptions.subject
          );
        }
      } else {
        const info = await this.transporter.sendMail({
          from: this.transporter.options.from || '',
          to: emailOptions.address?.to + ';' + (this.config.to || ''),
          cc: emailOptions.address?.cc + ';' + (this.config.cc || ''),
          bcc: emailOptions.address?.bcc + ';' + (this.config.bcc || ''),
          subject: emailOptions.subject,
          text: emailOptions.text,
          html: emailOptions.html || '',
        });
        if (process.env.LOGGING_VERBOSE === 'true') {
          logger.info(`📨 Email sent: ${info.messageId}`);
        }
      }
    } catch (error) {
      logger.error('Error sending email:', error);
    } finally {
      this.processing = false;
      setImmediate(() => this.processNext());
    }
  }
}

/**
 * Creates an instance of EmailQueueService with the provided configuration.
 * @param {EmailConfig} config - The configuration for the email service.
 * @returns {EmailQueueService} An instance of EmailQueueService.
 */
export function createEmailQueueService(config: EmailConfig) {
  return new EmailQueueService(config);
}
