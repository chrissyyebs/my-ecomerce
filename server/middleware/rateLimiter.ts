// ============================================================
// Rate Limiter Middleware
// Uses express-rate-limit with built-in IPv6-safe key generator
// ============================================================

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter — 100 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests — please try again shortly',
  },
});

/**
 * Auth-adjacent rate limiter — 10 requests per 15 min per IP.
 * Applied to login, signup validation, password reset.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many authentication attempts — please try again later',
  },
});

/**
 * Checkout rate limiter — 5 requests per 5 min per IP.
 * Protects against checkout spam and stock race conditions.
 */
export const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many checkout attempts — please wait before trying again',
  },
});

/**
 * OTP request rate limiter — max 3 requests per 10 min per IP.
 * Prevents OTP SMS/Email spam and brute force attacks.
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many OTP requests — please wait 10 minutes before requesting another verification code.',
  },
});
