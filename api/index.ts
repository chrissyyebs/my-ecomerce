// ============================================================
// Vercel Serverless Function Entry Point
// Loads server env vars, then boots Express app
// ============================================================

import { loadServerEnv } from '../backend/config/env.js';

// Load .env.server.local before any config module reads process.env
loadServerEnv();

import { createApp } from '../backend/app.js';

const app = createApp();

export default app;
