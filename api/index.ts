// ============================================================
// Vercel Serverless Function Entry Point
// Loads server env vars, then boots Express app
// ============================================================

import { loadServerEnv } from '../server/config/env.js';

// Load .env.server.local before any config module reads process.env
loadServerEnv();

import { createApp } from '../server/app.js';

const app = createApp();

export default app;
