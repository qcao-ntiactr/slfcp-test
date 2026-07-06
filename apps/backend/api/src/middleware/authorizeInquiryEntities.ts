import { Request, Response, NextFunction } from 'express';

import { logWithOperation } from '../utils/structuredLogger.js';
import { EntityEnum, EntityService } from '../services/entities.js';
import type { InquiryType, MessageType } from '../services/inquiries.js';
import { accessInquiry } from '../access/accessInquiry.js';
import { UsersService } from '../services/users.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

/**
 * Middleware to verify the entities involved in an inquiry.
 * This function checks if both entities exist, validates their types,
 * and ensures that the sender's entity is allowed to create an inquiry with the target entity.
 * If any validation fails, it responds with an error.
 *
 * @param req - Express request object containing the inquiry data in the body.
 * @param res - Express response object used to send the response.
 * @param next - Express next function to pass control to the next middleware.
 */
export const verifyEntities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const inquiry = req.body as InquiryType;
  if (!inquiry.entityA_id || !inquiry.entityB_id) {
    res.status(400).json({ message: 'Missing entity IDs in inquiry' });
    return;
  }

  const userEmail = req.headers['x-user-email'] as string;
  const userA = await new UsersService().getUserByEmail(userEmail);

  if (!userA) {
    logWithOperation('warn', 'User not found', null, {
      userEmail: sanitizeForLogs(userEmail),
    });
    throw new Error(`User with email ${userEmail} not found`);
  }

  const entityA = userA?.entity;
  //set the entityA_id in the request body from user's entity
  req.body.entityA_id = entityA?.id;

  if (!entityA) {
    res.status(400).json({ message: "Sender's entity not found" });
    return;
  }

  if (!Object.values(EntityEnum).find((v) => v === entityA.type)) {
    res.status(400).json({ message: "Invalid sender's entity" });
    return;
  }

  const entityService = new EntityService();

  const entityB = await entityService.getEntityById(inquiry.entityB_id);
  if (!entityB) {
    res.status(400).json({ message: 'Target entity not found' });
    return;
  }

  if (!Object.values(EntityEnum).find((v) => v === entityB.type)) {
    res.status(400).json({ message: 'Invalid target entity' });
    return;
  }

  if (!accessInquiry[entityA.type]?.includes(entityB.type)) {
    res.status(400).json({
      message: `User's entity ${entityA} not allowed to create inquiry with entity ${entityB}`,
    });
    return;
  }

  next();
};

/**
 * Middleware to verify the entity of the user making the request.
 * This function checks if the user exists, retrieves their entity,
 * and validates the entity type. If any validation fails, it responds with an error.
 *
 * @param req - Express request object containing the message data in the body.
 * @param res - Express response object used to send the response.
 * @param next - Express next function to pass control to the next middleware.
 */
export const verifyEntity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const msg = req.body as MessageType;

  const userEmail = req.headers['x-user-email'] as string;
  const user = await new UsersService().getUserByEmail(userEmail);
  const entityId = user?.entity?.id;
  if (!entityId) {
    res.status(400).json({ message: 'Entity ID not found for user' });
    return;
  }
  if (!user) {
    logWithOperation('warn', 'User not found', null, {
      userEmail: sanitizeForLogs(userEmail),
    });
    throw new Error(`User with email ${userEmail} not found`);
  }
  req.body.sender_id = user.id;

  const entityService = new EntityService();
  const entity = await entityService.getEntityByUserId(msg.sender_id);

  if (!entity) {
    res.status(404).json({ message: 'Entity not found' });
    return;
  }

  if (!Object.values(EntityEnum).find((v) => v === entity.type)) {
    res.status(400).json({ message: 'Invalid entity' });
    return;
  }

  next();
};
