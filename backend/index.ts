// ============================================================
// Local Server Entry Point
// Boots Express app on http://localhost:3000 for local development
// ============================================================

import { loadServerEnv } from './config/env.js';

// Load server environment variables
loadServerEnv();

import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Process Warning] Unhandled Promise Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err.message || err);
});

app.listen(PORT, () => {
  console.log(`\n🚀 The Tote Life API Server running locally on http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Secret Admin Endpoint: http://localhost:${PORT}/api/admin/verify-password\n`);
});
