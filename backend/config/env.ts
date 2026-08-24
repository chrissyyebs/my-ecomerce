// ============================================================
// Server Environment Loader
// Loads backend/.env.local or backend/.env for local development
// In production (Vercel), env vars come from project settings
// ============================================================

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

export function loadServerEnv(): void {
  // Only load from file in development — Vercel injects env vars in production
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    return;
  }

  const pathsToTry = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'backend/.env.local'),
    resolve(process.cwd(), 'backend/.env'),
    resolve(process.cwd(), '.env.server.local'),
  ];

  for (const envPath of pathsToTry) {
    if (existsSync(envPath)) {
      config({ path: envPath });
      break;
    }
  }
}

