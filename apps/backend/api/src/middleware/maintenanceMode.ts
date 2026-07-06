import { Request, Response, NextFunction } from 'express';

export const maintenanceMode = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isUnavailable = process.env.UNDER_MAINTENANCE === 'true';

  // Allow healthcheck to continue working
  if (req.path === '/healthcheck' || req.path.includes('favicon')) {
    return next();
  }

  if (isUnavailable) {
    return res.status(503).json({
      message: `Our site is currently undergoing scheduled maintenance to improve your experience.We'll be back later.`,
    });
  }

  next();
};
