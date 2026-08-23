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

  const backendEnvLocal = resolve(process.cwd(), 'backend/.env.local');
  const backendEnv = resolve(process.cwd(), 'backend/.env');

  if (existsSync(backendEnvLocal)) {
    config({ path: backendEnvLocal });
  } else if (existsSync(backendEnv)) {
    config({ path: backendEnv });
  } else {
    // Fallback to root .env.server.local if present
    const rootServerEnv = resolve(process.cwd(), '.env.server.local');
    if (existsSync(rootServerEnv)) {
      config({ path: rootServerEnv });
    }
  }
}
