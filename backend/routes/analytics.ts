// ============================================================
// Analytics Routes
// Pre-aggregated endpoints feeding ApexCharts
// ============================================================

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getSalesByPeriod, getCategorySales } from '../services/analytics.service.js';
import { badRequest } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/admin/analytics/sales?range=daily|weekly|monthly|yearly
 * Returns { categories: [...], series: [...] } shaped directly for ApexCharts bar chart
 */
router.get(
  '/sales',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const range = (req.query.range as string) || 'daily';
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(range)) {
        throw badRequest('range must be one of: daily, weekly, monthly, yearly');
      }

      const salesData = await getSalesByPeriod(range as any);
      res.json(salesData);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/analytics/category-sales
 * Category-level totals & subcategory drilldown for pie/donut chart
 */
router.get(
  '/category-sales',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (_req, res, next) => {
    try {
      const catData = await getCategorySales();
      res.json(catData);
    } catch (err) {
      next(err);
    }
  }
);

export const analyticsRouter = router;
