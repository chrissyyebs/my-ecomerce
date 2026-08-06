// ============================================================
// Server Environment Loader
// Loads server/.env.local or server/.env for local development
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

  const serverEnvLocal = resolve(process.cwd(), 'server/.env.local');
  const serverEnv = resolve(process.cwd(), 'server/.env');

  if (existsSync(serverEnvLocal)) {
    config({ path: serverEnvLocal });
  } else if (existsSync(serverEnv)) {
    config({ path: serverEnv });
  } else {
    // Fallback to root .env.server.local if present
    const rootServerEnv = resolve(process.cwd(), '.env.server.local');
    if (existsSync(rootServerEnv)) {
      config({ path: rootServerEnv });
    }
  }
}
