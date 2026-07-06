import {
  formatEmailMarkdown,
  formatEmailMarkdownHtml,
} from '../utils/formatEmailMarkdown.js';

import { EmailParams } from './emailService.js';

const escapeHtml = (value?: string) =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const wrapEmailHtml = (content: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">${content}</div>`;

/**
 * Generates an email template for notifying the requester that their request was submitted.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const requestSubmittedTemplate = (params: EmailParams) => ({
  subject: `Your Request for ${params.requestId} has been submitted`,
  body: `Dear ${params.toName}.\n\nYour request for ${params.requestId} has been successfully submitted for processing by NTIA.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template to notify NTIA staff that a request is ready for initial review.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaReviewTemplate = (params: EmailParams) => ({
  subject: `${params.requestId} is ready for initial review`,
  body: `Dear ${params.toName}.\n\nYou have a request waiting with the ${params.requestId} to complete the initial review.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template to inform an agency that NTIA has submitted a request for review.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaInitialApproveTemplate = (params: EmailParams) => ({
  subject: `New ${params.requestId} request has been submitted for review`,
  body: `Dear ${params.toName},\n\nNTIA has performed an initial review and submitted a request on ${params.requestId} for your review.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template notifying that a specific agency has submitted a status update on a request.
 * @param params - The email parameters including recipient info, request ID, and agency name in bodyParams[0].
 * @returns An object containing the subject and body of the email.
 */
export const concurrenceSubmittedTemplate = (params: EmailParams) => ({
  subject: `Request ${params.requestId} has been updated by ${params.bodyParams?.[0]}`,
  body: `Dear ${params.toName},\n\nAgency ${params.bodyParams?.[0] || 'an agency'} has updated the status of the request ${params.requestId}. Please login to the SLFCP Portal to review, evaluate and take final action as applicable.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template notifying that one or more federal agencies have voted to concur the request with conditions.
 * @param params - The email parameters including recipient info, requestId, agency abbreviation, and conditions.
 * @returns An object containing the subject and body of the email.
 */
export const concurrenceWithConditionsTemplate = (params: EmailParams) => ({
  subject: `Request ${params.requestId} has been approved with conditions`,
  body: `Dear ${params.toName},\n\nAgency(${params.bodyParams?.[0]}) has concurred request ${params.requestId} with applicable conditions.\n\nConditions:\n${formatEmailMarkdown(params.bodyParams?.[1])}\n\nThank you,\nSpace Portal Team`,
  html: wrapEmailHtml(
    `<p>Dear ${escapeHtml(params.toName)},</p><p>Agency(${escapeHtml(params.bodyParams?.[0])}) has concurred request ${escapeHtml(params.requestId)} with applicable conditions.</p><p><strong>Conditions:</strong></p>${formatEmailMarkdownHtml(params.bodyParams?.[1])}<p>Thank you,<br />Space Portal Team</p>`
  ),
});

/**
 * Generates an email template notifying that one or more federal agencies have voted to not concur the request.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const federalNotConcurredTemplate = (params: EmailParams) => ({
  subject: `Request ${params.requestId} has been denied`,
  body: `Dear ${params.toName},\n\n${params.bodyParams?.[0]} has denied the request ${params.requestId}. \n\nPlease review, evaluate, and provide final action on the space portal request. \n\nThank you,\nSpace Portal Team`,
});

/**
 * Generates an email template notifying that all agencies have submitted their concurrence.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const allConcurrencesSubmittedTemplate = (params: EmailParams) => ({
  subject: `Request ${params.requestId} is ready for final review`,
  body: `Dear ${params.toName},\n\nAll Federal agencies have reviewed request ${params.requestId}. Please review, evaluate, and take final action on request ${params.requestId}.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template notifying the commercial entity that NTIA has approved the request with conditions.
 * @param params - The email parameters including recipient info, request ID, and conditions.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaApproveWithConditionsTemplate = (params: EmailParams) => ({
  subject: `Request ${params.requestId} has been Coordinated with conditions`,
  body: `Dear Commercial user,\n\nNTIA has coordinated the request ${params.requestId} with applicable conditions.\n\nConditions:\n${formatEmailMarkdown(params.bodyParams?.[0])}\n\nThank you,\nSpace Portal Team`,
  html: wrapEmailHtml(
    `<p>Dear Commercial user,</p><p>NTIA has coordinated the request ${escapeHtml(params.requestId)} with applicable conditions.</p><p><strong>Conditions:</strong></p>${formatEmailMarkdownHtml(params.bodyParams?.[0])}<p>Thank you,<br />Space Portal Team</p>`
  ),
});

/**
 * Generates an email template to inform the commercial entity that NTIA has approved a request.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaFinalApproveTemplate = (params: EmailParams) => ({
  subject: `${params.requestId} Coordinated with NTIA`,
  body: `Dear ${params.toName},\n\nYour request for ${params.requestId} has been coordinated by NTIA.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template to inform an commercial entity that NTIA has denied the request.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaFinalDenialTemplate = (params: EmailParams) => ({
  subject: `Request ${params.requestId} has been denied`,
  body: `Dear ${params.toName},\n\n${params.requestId} has been denied by NTIA. Please review and submit a new request if you still require the pre-coordination to be done.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying agencies that a request has been submitted for revision.
 *
 * @param params - The parameters required to populate the email template.
 * @param params.requestId - The unique identifier for the SLFCP request.
 * @param params.toName - The name of the recipient.
 * @param params.optional - Optional additional content to include in the email body.
 * @returns An object containing the subject and body of the email.
 */
export const initialRevisionTemplate = (params: EmailParams) => ({
  subject: `Initial Non-Approval and Revision Request of your ${params.requestId} request`,
  body: `Dear ${params.toName},\n\nYour request ${params.requestId} has been reviewed by NTIA and is rejected. However, NTIA has requested for the following revisions to be made and resubmitted:\n\n<Revisions>\n${params.bodyParams?.[0]}\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying agencies that a request has been submitted for revision.
 *
 * @param params - The parameters required to populate the email template.
 * @param params.requestId - The unique identifier for the SLFCP request.
 * @param params.toName - The name of the recipient.
 * @param params.optional - Optional additional content to include in the email body.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaFinalRevisionTemplate = (params: EmailParams) => ({
  subject: `${params.requestId} request has been submitted for revision`,
  body: `Dear ${params.toName},\n\nNTIA has performed a review and submitted a request on ${params.requestId} for revision.\n<Revisions>\n${params.bodyParams?.[0]}\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying agencies that a request has been submitted for revision.
 *
 * @param params - The parameters required to populate the email template.
 * @param params.requestId - The unique identifier for the SLFCP request.
 * @param params.toName - The name of the recipient.
 * @param params.optional - Optional additional content to include in the email body.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaFinalRevisionAgenciesTemplate = (params: EmailParams) => ({
  subject: `${params.requestId} request has been submitted for revision`,
  body: `Dear ${params.toName},\n\nRequest ${params.requestId} has been revised and resubmitted for review.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying a user that their request revision has been submitted.
 *
 * @param params - The parameters required to populate the email template.
 * @param params.requestId - The unique identifier for the SLFCP request.
 * @param params.toName - The name of the recipient.
 * @param params.optional - Optional additional content to include in the email body.
 * @returns An object containing the subject and body of the email.
 */
export const revisionSubmittedTemplate = (params: EmailParams) => ({
  subject: `Your Request Revision for ${params.requestId} has been submitted`,
  body: `Dear ${params.toName}.\n\nYour request revision for ${params.requestId} has been successfully submitted for processing by NTIA.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying a user that a revision is ready for review.
 *
 * @param params - The parameters required to populate the email template.
 * @param params.requestId - The unique identifier for the SLFCP request.
 * @param params.toName - The name of the recipient.
 * @param params.optional - Optional additional content to include in the email body.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaRevisionReviewTemplate = (params: EmailParams) => ({
  subject: `Revision ${params.requestId} is ready for review`,
  body: `Dear ${params.toName}.\n\nYou have a revision for request ${params.requestId} waiting to complete the review.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates a verification email with a link.
 * @param params - The email parameters including recipient info and verification link.
 * @returns An object containing the subject and body of the email.
 */
export const verifyEmailTemplate = (params: EmailParams) => ({
  subject: `Verify your email for SLFCP`,
  body: `Dear ${params.toName},\n\nPlease verify your email address by clicking the link below:\n\n${params.bodyParams?.[0]}\n\nThis link will expire in 1 hour.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying the requester that their request has been auto-approved during the initial phase.
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaInitialAutoApproveTemplate = (params: EmailParams) => ({
  subject: `Request ${params.requestId} has been auto approved during the initial phase`,
  body: `Dear ${params.toName},\n\nThe request ${params.requestId} has been auto-approved after the 7 days waiting period. It has been pushed to the federal agencies to review and take the next step.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying NTIA that a request has been pending concurrence action
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaConcurrenceReminderEmailTemplate = (params: EmailParams) => ({
  subject: `Attention Fed User(s): ${params.requestId} request has been waiting for your review`,
  body: `Dear ${params.toName},\n\nYou have a request  ${params.requestId} waiting for your review and take an action.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});

/**
 * Generates an email template for notifying NTIA that a request has been pending approval .
 * @param params - The email parameters including recipient info and request ID.
 * @returns An object containing the subject and body of the email.
 */
export const ntiaApprovalReminderEmailTemplate = (params: EmailParams) => ({
  subject: `Attention NTIA: ${params.requestId} request has been waiting for your review`,
  body: `Dear ${params.toName},\n\nYou have a request ${params.requestId} waiting for your review and take an action.\n\nThank you,\nNTIA Space Portal Team\n\n${params.optional || ''}`,
});
