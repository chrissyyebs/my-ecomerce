// ============================================================
// Vercel Serverless Function Entry Point
// Loads server env vars, then boots Express app
// ============================================================

import { loadServerEnv } from '../config/env.js';

loadServerEnv();

import { createApp } from '../app.js';

const app = createApp();

export default app;
