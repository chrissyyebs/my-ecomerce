// ============================================================
// Cron: Daily Health Check (Combined)
// Runs once daily — combines low-stock + stuck-order checks
// into a single endpoint for Vercel Hobby plan compatibility
// ============================================================

import { loadServerEnv } from '../../config/env.js';
loadServerEnv();

import type { Request, Response } from 'express';
import { getLowStockProducts, getStuckOrders } from '../../services/analytics.service.js';
import { notifyLowStock, notifyStuckOrders } from '../../services/telegram.service.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}` && req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ error: true, message: 'Unauthorized cron request' });
    return;
  }

  const results: Record<string, any> = {};

  // --- Low Stock Check ---
  try {
    const lowStockItems = await getLowStockProducts(10);
    if (lowStockItems.length > 0) {
      await notifyLowStock(lowStockItems);
    }
    results.low_stock = { success: true, count: lowStockItems.length, items: lowStockItems };
  } catch (err: any) {
    console.error('[Cron:daily-health-check] Low stock error:', err);
    results.low_stock = { success: false, error: err.message };
  }

  // --- Stuck Order Check ---
  try {
    const stuckOrders = await getStuckOrders(1440);
    if (stuckOrders.length > 0) {
      await notifyStuckOrders(stuckOrders);
    }
    results.stuck_orders = { success: true, count: stuckOrders.length, orders: stuckOrders };
  } catch (err: any) {
    console.error('[Cron:daily-health-check] Stuck orders error:', err);
    results.stuck_orders = { success: false, error: err.message };
  }

  const allSucceeded = results.low_stock?.success && results.stuck_orders?.success;
  res.status(allSucceeded ? 200 : 207).json({
    success: allSucceeded,
    checks: results,
  });
}
