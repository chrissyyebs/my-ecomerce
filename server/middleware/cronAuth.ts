// ============================================================
// Cron Auth Middleware
// Verifies CRON_SECRET header on scheduled task routes
// Prevents public internet from triggering cron endpoints
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

/**
 * Middleware: verifies that the request includes a valid CRON_SECRET.
 * Vercel sends this in the `authorization` header as `Bearer <secret>`.
 */
export function requireCronAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    next(
      new AppError(
        500,
        'Server configuration error',
        'CRON_SECRET environment variable is not set'
      )
    );
    return;
  }

  const authHeader = req.headers.authorization;

  if (authHeader === `Bearer ${cronSecret}`) {
    next();
    return;
  }

  // Also check the x-cron-secret custom header as a fallback
  const customHeader = req.headers['x-cron-secret'];

  if (customHeader === cronSecret) {
    next();
    return;
  }

  next(
    new AppError(
      401,
      'Unauthorized',
      `Cron auth failed — missing or invalid secret header`
    )
  );
}
