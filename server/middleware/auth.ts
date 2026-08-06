// ============================================================
// Auth Middleware
// requireAuth — checks Clerk session
// requireRole — checks admin role in DB
// requireAdminPassword — checks extra admin dashboard password
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { supabase } from '../config/supabase.js';
import { AppError } from './errorHandler.js';
import type { AdminRole } from '../types/index.js';

/**
 * Middleware: requires a valid Clerk session.
 * Attaches userId to req.auth for downstream use.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const auth = getAuth(req);

  if (!auth?.userId) {
    next(new AppError(401, 'Authentication required', 'No Clerk session found'));
    return;
  }

  next();
}

/**
 * Middleware factory: requires the authenticated user to have a specific admin role.
 * Must be used AFTER requireAuth.
 */
export function requireRole(...allowedRoles: AdminRole[]) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const auth = getAuth(req);

    if (!auth?.userId) {
      next(new AppError(401, 'Authentication required'));
      return;
    }

    try {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('role, is_active')
        .eq('clerk_user_id', auth.userId)
        .single();

      if (error || !admin) {
        next(
          new AppError(
            403,
            'You do not have permission to perform this action',
            `User ${auth.userId} not found in admins table`
          )
        );
        return;
      }

      if (!admin.is_active) {
        next(
          new AppError(
            403,
            'Your admin account has been deactivated',
            `Admin ${auth.userId} is deactivated`
          )
        );
        return;
      }

      if (!allowedRoles.includes(admin.role as AdminRole)) {
        next(
          new AppError(
            403,
            'You do not have permission to perform this action',
            `User ${auth.userId} has role "${admin.role}", needs one of: ${allowedRoles.join(', ')}`
          )
        );
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: verifies the secondary Admin Dashboard Password from request header.
 * Checked against process.env.ADMIN_DASHBOARD_PASSWORD.
 */
export function requireAdminPassword(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const expectedPassword = process.env.ADMIN_DASHBOARD_PASSWORD;

  // If no password is configured, skip check
  if (!expectedPassword) {
    next();
    return;
  }

  const providedPassword = req.headers['x-admin-password'] as string;

  if (!providedPassword || providedPassword !== expectedPassword) {
    next(new AppError(401, 'Invalid admin dashboard password'));
    return;
  }

  next();
}
