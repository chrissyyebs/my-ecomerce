// ============================================================
// Cron: Stuck Order Check
// Runs every 15-30 mins (e.g., */30 * * * *)
// ============================================================

import { loadServerEnv } from '../../config/env.js';
loadServerEnv();

import type { Request, Response } from 'express';
import { getStuckOrders } from '../../services/analytics.service.js';
import { notifyStuckOrders } from '../../services/telegram.service.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}` && req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ error: true, message: 'Unauthorized cron request' });
    return;
  }

  try {
    const stuckOrders = await getStuckOrders(30);
    if (stuckOrders.length > 0) {
      await notifyStuckOrders(stuckOrders);
    }

    res.status(200).json({
      success: true,
      stuck_orders_count: stuckOrders.length,
      orders: stuckOrders,
    });
  } catch (err: any) {
    console.error('[Cron:stuck-order-check] Error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}
