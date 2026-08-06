// ============================================================
// Express 5 App Factory
// Configures middleware, raw body preservation, routes & error handling
// ============================================================

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { clerkAuthMiddleware } from './config/clerk.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';

import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { analyticsRouter } from './routes/analytics.js';
import { supportRouter } from './routes/support.js';
import { adminManagementRouter } from './routes/admin.js';
import { telegramWebhookHandler } from './routes/telegram.js';

export function createApp() {
  const app = express();

  // Basic security & CORS
  app.use(cors());

  // JSON Body Parser with rawBody preservation
  app.use(
    express.json({
      verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    })
  );

  app.use(express.urlencoded({ extended: true }));

  // Clerk Auth Middleware (attaches session state to all requests)
  app.use(clerkAuthMiddleware);

  // General rate limiter
  app.use('/api', generalLimiter);

  // Test / Health Route
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'The Tote Life API',
      timestamp: new Date().toISOString(),
      platform: 'Vercel Serverless Functions',
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin/analytics', analyticsRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/admin', adminManagementRouter);
  app.all('/api/telegram/webhook', telegramWebhookHandler);

  // Catch-all 404 handler for API routes (Express 5 requires named wildcard)
  app.use('/api/{*path}', (_req: Request, res: Response) => {
    res.status(404).json({
      error: true,
      message: 'API route not found',
    });
  });

  // Global 404 handler for unmatched routes
  app.use('{*path}', (_req: Request, res: Response) => {
    res.status(404).json({
      error: true,
      message: 'Route not found',
    });
  });

  // Global Error Handler
  app.use(globalErrorHandler);

  return app;
}
