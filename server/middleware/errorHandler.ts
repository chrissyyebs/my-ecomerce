// ============================================================
// Error Handler Middleware
// AppError class + global Express error handler
// Sanitized client errors; detailed server-side logs
// ============================================================

import type { Request, Response, NextFunction } from 'express';

/**
 * Custom application error with a public-safe message and internal log detail.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly logDetail: string;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    logDetail?: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.logDetail = logDetail || message;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Common error factory helpers
export const notFound = (entity: string) =>
  new AppError(404, `${entity} not found`);

export const unauthorized = (detail?: string) =>
  new AppError(401, 'Authentication required', detail);

export const forbidden = (detail?: string) =>
  new AppError(403, 'You do not have permission to perform this action', detail);

export const badRequest = (message: string, detail?: string) =>
  new AppError(400, message, detail);

/**
 * Global Express error handler — must be registered LAST.
 */
export function globalErrorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log full detail server-side
  if (err instanceof AppError) {
    console.error(
      `[AppError ${err.statusCode}] ${err.logDetail}`,
      err.isOperational ? '' : err.stack
    );
  } else {
    console.error('[UnhandledError]', err.stack || err.message);
  }

  // Send sanitized response to client
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: true,
      message: err.message,
    });
    return;
  }

  // Unknown errors — generic message, never leak stack/details
  res.status(500).json({
    error: true,
    message: "We couldn't complete your request right now — please try again",
  });
}
