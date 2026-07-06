import {
  Request as _ExpressRequest,
  Response as _ExpressResponse,
} from 'express';

import { Role } from '../middleware/roles';

declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      correlationId?: string;
      user?: {
        [key: string]: unknown;
        sub: string;
        role: Role;
        email?: string;
        name?: string;
        method?: string;
        id?: string;
        externalId?: string;
      };
    }
  }
}
