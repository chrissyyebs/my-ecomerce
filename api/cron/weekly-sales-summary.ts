// ============================================================
// Cron: Weekly Sales Summary
// Runs once weekly (e.g., 0 9 * * 1)
// ============================================================

import { loadServerEnv } from '../../backend/config/env.js';
loadServerEnv();

import type { Request, Response } from 'express';
import { getSalesSummary } from '../../backend/services/analytics.service.js';
import { notifySalesSummary } from '../../backend/services/telegram.service.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}` && req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ error: true, message: 'Unauthorized cron request' });
    return;
  }

  try {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const summary = await getSalesSummary(start, end);
    await notifySalesSummary('Weekly', summary);

    res.status(200).json({ success: true, period: 'weekly', summary });
  } catch (err: any) {
    console.error('[Cron:weekly-sales-summary] Error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}
