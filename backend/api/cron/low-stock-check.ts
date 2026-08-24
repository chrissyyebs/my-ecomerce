// ============================================================
// Cron: Low Stock Check
// Runs every few hours (e.g., 0 */6 * * *)
// ============================================================

import { loadServerEnv } from '../../config/env.js';
loadServerEnv();

import type { Request, Response } from 'express';
import { getLowStockProducts } from '../../services/analytics.service.js';
import { notifyLowStock } from '../../services/telegram.service.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}` && req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ error: true, message: 'Unauthorized cron request' });
    return;
  }

  try {
    const lowStockItems = await getLowStockProducts(10);
    if (lowStockItems.length > 0) {
      await notifyLowStock(lowStockItems);
    }

    res.status(200).json({
      success: true,
      low_stock_count: lowStockItems.length,
      items: lowStockItems,
    });
  } catch (err: any) {
    console.error('[Cron:low-stock-check] Error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}
