import { Request, Response } from 'express';

import { UsersService } from '../services/users.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import {
  createLogWithUserContext,
  logError,
  logHttpRequest,
  OperationType,
} from '../utils/structuredLogger.js';

const usersService = new UsersService();

export class UsersController {
  /**
   * Get user by external ID
   * GET /users/:externalId
   */
  async getUserByExternalId(req: Request, res: Response) {
    try {
      const { externalId } = req.params;

      if (!externalId) {
        logError(
          'External ID is required',
          'Bad Request',
          {
            operation: 'getUserByExternalId',
            component: 'users_controller',
            httpStatusCode: 400,
          },
          req
        );
        return res.status(400).json({ error: 'External ID is required' });
      }

      const user = await usersService.getUserByExternalId(externalId);

      if (!user) {
        logError(
          'User not found',
          'Not Found',
          {
            operation: 'getUserByExternalId',
            component: 'users_controller',
            httpStatusCode: 404,
          },
          req
        );
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user data with concur permissions
      const userData = {
        id: user.id,
        external_id: user.external_id,
        name: user.name,
        email: user.email,
        can_concur: user.can_concur,
        entity_id: user.entity_id,
        entity: {
          id: user.entity.id,
          name: user.entity.name,
          abbreviation: user.entity.abbreviation,
          type: user.entity.type,
          active: user.entity.active,
        },
      };

      logHttpRequest(
        'Retrieved user data by external ID',
        req,
        res,
        createLogWithUserContext(
          'Retrieved user data by external ID',
          {
            externalId: sanitizeForLogs(externalId),
            userId: user.id,
            entityType: user.entity.type,
          },
          req
        )
      );

      res.json(userData);
    } catch (error) {
      // Structured error log with user context
      logError(
        'Error in getUserByExternalId',
        error as Error,
        {
          operation: 'getUserByExternalId',
          component: 'users_controller',
          operationType: OperationType.HTTP_REQUEST,
          httpStatusCode: 500,
        },
        req
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user by email
   * GET /users/email/:email
   */
  async getUserByEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;

      if (!email) {
        logError(
          'Email is required',
          'Bad Request',
          {
            operation: 'getUserByEmail',
            component: 'users_controller',
            httpStatusCode: 400,
          },
          req
        );
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await usersService.getUserByEmail(email);

      if (!user) {
        logError(
          'User not found',
          'Not Found',
          {
            operation: 'getUserByEmail',
            component: 'users_controller',
            httpStatusCode: 404,
          },
          req
        );
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user data with concur permissions
      const userData = {
        id: user.id,
        external_id: user.external_id,
        name: user.name,
        email: user.email,
        can_concur: user.can_concur,
        entity_id: user.entity_id,
        entity: {
          id: user.entity.id,
          name: user.entity.name,
          abbreviation: user.entity.abbreviation,
          type: user.entity.type,
          active: user.entity.active,
        },
      };

      logHttpRequest(
        'Retrieved user data by email',
        req,
        res,
        createLogWithUserContext(
          'User fetch by email',
          {
            email: sanitizeForLogs(email),
            userId: user.id,
            entityType: user.entity.type,
          },
          req
        )
      );
      res.json(userData);
    } catch (error) {
      // Structured error log with user context
      logError(
        'Error in getUserByEmail',
        error as Error,
        {
          operation: 'getUserByEmail',
          component: 'users_controller',
          operationType: OperationType.HTTP_REQUEST,
          httpStatusCode: 500,
        },
        req
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  /**
   * Return unique active user emails for an entity
   */
  async getActiveUsersEmailsByEntityId(entityId: number): Promise<string[]> {
    if (!entityId) {
      throw new Error('Entity ID is required');
    }

    const entityUsers = await usersService.getUsersByEntityId(entityId);
    const emails = [
      ...new Set(
        (entityUsers || [])
          .filter((user) => user?.active)
          .map((user) => user?.email?.trim())
          .filter(Boolean) as string[]
      ),
    ];

    return emails;
  }
}
