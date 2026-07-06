import { createEmailQueueService } from '@slfcp/emailer';

import prisma from '../utils/database.js';
import { UsersController } from '../controllers/users.js';

import {
  emailServer,
  emailPort,
  emailFrom,
  emailSecure,
  emailTo,
  emailCC,
  emailBCC,
  emailEnabled,
} from './../config.js';

/**
 * Defines the parameters required to construct an email message.
 */
export interface EmailParams {
  address: {
    to?: string;
    cc?: string;
    bcc?: string;
  };
  toName?: string;
  requestId?: string;
  /**
   * Optional array of strings to be interpolated in the email body.
   */
  bodyParams?: string[];

  /**
   * Additional optional message content to append to the email body.
   */
  optional?: string;
}

/**
 * Enhanced email parameters that include user and entity information
 */
export interface EnhancedEmailParams {
  userId?: number;
  userEmail?: string;
  userName?: string;
  entityIds?: number[];
  additionalEmails?: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
  };
  requestId?: string;
  bodyParams?: string[];
  optional?: string;
}

/**
 * Represents a function that returns an email template with a subject and body,
 * based on the given parameters.
 */
// eslint-disable-next-line no-unused-vars
type EmailTemplate = (params: EmailParams) => {
  subject: string;
  body: string;
  html?: string;
};

export type emailQueueType = {
  template: EmailTemplate;
  params: EnhancedEmailParams;
  logMessage: string;
};

// Create the queue service instance (in-memory queue)
const emailQueueService = createEmailQueueService({
  from: emailFrom,
  host: emailServer,
  port: emailPort,
  secure: emailSecure,
  to: emailTo,
  cc: emailCC,
  bcc: emailBCC,
  enabled: emailEnabled,
});

/**
 * EmailService provides a generic method to send email notifications
 * using customizable templates and dynamic content.
 */
export class EmailService {
  /**
   * Sends an email using the given template and parameters.
   *
   * @param template - A function that generates the subject and body of the email.
   * @param params - The parameters used to personalize the email content.
   * @returns A Promise that resolves when the email has been sent.
   */
  static sendNotification(template: EmailTemplate, params: EmailParams) {
    const { subject, body, html } = template(params);
    emailQueueService.add({
      address: params.address!,
      subject,
      text: body,
      html,
    });
  }

  /**
   * Gets user and entity information for email sending
   * @param userId - The user ID to get information for
   * @returns User and entity information
   */
  static async getUserAndEntityInfo(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        entity: true,
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return {
      user,
      entity: user.entity,
      distributionEmail: user.entity.distribution_list_email,
    };
  }

  /**
   * Gets entity information by entity ID
   * @param entityId - The entity ID to get information for
   * @returns Entity information
   */
  static async getEntityInfo(entityId: number) {
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new Error(`Entity with ID ${entityId} not found`);
    }

    return {
      entity,
      distributionEmail: entity.distribution_list_email,
    };
  }

  /**
   * Builds email addresses including user email and entity distribution email
   * @param userEmail - The primary user email
   * @param distributionEmail - The entity's distribution email (optional)
   * @param additionalEmails - Additional emails to include
   * @returns Formatted email address string
   */
  static buildEmailAddresses(
    userEmail?: string,
    distributionEmail?: string | null,
    additionalEmails?: string[]
  ): string {
    const emails: string[] = [];

    if (userEmail) {
      emails.push(userEmail);
    }

    if (distributionEmail) {
      emails.push(distributionEmail);
    }

    if (additionalEmails) {
      emails.push(...additionalEmails);
    }

    return emails.join(';');
  }

  /**
   * Enhanced email sending that automatically includes entity distribution emails
   * @param template - Email template function
   * @param params - Enhanced email parameters
   */
  static async sendEnhancedNotification(
    template: EmailTemplate,
    params: EnhancedEmailParams
  ) {
    let toEmails: string[] = [];
    let ccEmails: string[] = [];
    let bccEmails: string[] = [];

    // Add user email and its entity's distribution email
    if (params.userId) {
      const { user, distributionEmail } = await this.getUserAndEntityInfo(
        params.userId
      );
      toEmails.push(user.email);
      if (distributionEmail) {
        toEmails.push(distributionEmail);
      }
      const emails = await new UsersController().getActiveUsersEmailsByEntityId(
        user.entity_id
      );
      if (emails.length) {
        const uniqueNewEmails = emails.filter(
          (email) => !toEmails.includes(email)
        );
        toEmails.push(...uniqueNewEmails);
      }
    } else if (params.userEmail) {
      toEmails.push(params.userEmail);
    }

    // Add entity distribution emails for specified entities
    if (params.entityIds) {
      for (const entityId of params.entityIds) {
        const emails =
          await new UsersController().getActiveUsersEmailsByEntityId(entityId);
        if (emails.length) {
          const uniqueNewEmails = emails.filter(
            (email) => !toEmails.includes(email)
          );
          toEmails.push(...uniqueNewEmails);
        }
        const { distributionEmail } = await this.getEntityInfo(entityId);
        if (distributionEmail) {
          toEmails.push(distributionEmail);
        }
      }
    }

    // Add additional emails
    if (params.additionalEmails?.to) {
      toEmails.push(...params.additionalEmails.to);
    }
    if (params.additionalEmails?.cc) {
      ccEmails.push(...params.additionalEmails.cc);
    }
    if (params.additionalEmails?.bcc) {
      bccEmails.push(...params.additionalEmails.bcc);
    }

    // Build the email parameters
    const emailParams: EmailParams = {
      address: {
        to: toEmails.length > 0 ? toEmails.join(';') : undefined,
        cc: ccEmails.length > 0 ? ccEmails.join(';') : undefined,
        bcc: bccEmails.length > 0 ? bccEmails.join(';') : undefined,
      },
      toName: params.userName || 'User',
      requestId: params.requestId,
      bodyParams: params.bodyParams,
      optional: params.optional,
    };

    // Send the email using the existing method
    this.sendNotification(template, emailParams);
  }
}
