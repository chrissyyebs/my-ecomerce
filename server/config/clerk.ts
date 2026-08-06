// ============================================================
// Clerk Configuration
// Middleware and helpers for Clerk-based auth
// Passes through gracefully if CLERK_SECRET_KEY is not set
// ============================================================

import { clerkMiddleware } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';

const secretKey = process.env.CLERK_SECRET_KEY;

// Only initialize clerkMiddleware if secretKey exists and starts with sk_
const isClerkConfigured = Boolean(secretKey && secretKey.startsWith('sk_'));
const actualClerkMiddleware = isClerkConfigured ? clerkMiddleware({ secretKey }) : null;

/**
 * Clerk Auth Middleware — attaches auth state to requests.
 * Passes through if CLERK_SECRET_KEY is missing or invalid in local dev.
 */
export function clerkAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (actualClerkMiddleware) {
    try {
      actualClerkMiddleware(req, res, next);
      return;
    } catch (err) {
      console.warn('[ClerkAuth] Middleware error, proceeding:', err);
      next();
      return;
    }
  }

  next();
}
