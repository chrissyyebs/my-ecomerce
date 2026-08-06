// ============================================================
// Analytics Service
// Shared aggregation logic used by both API endpoints and cron routes
// Uses Postgres date_trunc for period grouping — no raw-row math in Node
// ============================================================

import { supabase } from '../config/supabase.js';
import type { SalesDataPoint, CategorySalesData } from '../types/index.js';

type SalesRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Get sales data grouped by period for bar charts.
 * Returns { categories: string[], series: number[] } shaped for ApexCharts.
 */
export async function getSalesByPeriod(range: SalesRange): Promise<{
  categories: string[];
  series: number[];
}> {
  // Map range to Postgres date_trunc interval and lookback
  const config: Record<SalesRange, { trunc: string; days: number }> = {
    daily: { trunc: 'day', days: 30 },
    weekly: { trunc: 'week', days: 90 },
    monthly: { trunc: 'month', days: 365 },
    yearly: { trunc: 'year', days: 1825 },
  };

  const { trunc, days } = config[range];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc('get_sales_by_period', {
    trunc_interval: trunc,
    cutoff_date: cutoff,
  });

  if (error) {
    // Fallback: raw query if RPC doesn't exist yet
    console.error('[AnalyticsService] RPC fallback:', error.message);

    const { data: orders, error: fallbackError } = await supabase
      .from('orders')
      .select('total_amount, placed_at')
      .eq('status', 'paid')
      .gte('placed_at', cutoff)
      .order('placed_at', { ascending: true });

    if (fallbackError || !orders) {
      return { categories: [], series: [] };
    }

    // Group in-memory as fallback
    const grouped = new Map<string, number>();
    for (const order of orders) {
      const date = new Date(order.placed_at);
      let key: string;
      switch (range) {
        case 'daily':
          key = date.toISOString().slice(0, 10);
          break;
        case 'weekly':
          key = `W${getISOWeek(date)}-${date.getFullYear()}`;
          break;
        case 'monthly':
          key = date.toISOString().slice(0, 7);
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          break;
      }
      grouped.set(key, (grouped.get(key) || 0) + Number(order.total_amount));
    }

    return {
      categories: Array.from(grouped.keys()),
      series: Array.from(grouped.values()),
    };
  }

  const points = (data as SalesDataPoint[]) || [];
  return {
    categories: points.map((p) => p.period),
    series: points.map((p) => Number(p.total)),
  };
}

/**
 * Get sales broken down by category for pie/donut chart with drilldown.
 */
export async function getCategorySales(): Promise<{
  topLevel: { name: string; total: number }[];
  drilldown: Record<string, { name: string; total: number }[]>;
}> {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      unit_price_at_purchase,
      product:products!inner (
        category:categories!inner (
          name,
          parent_group
        )
      )
    `)
    .not('order_id', 'is', null);

  if (error || !data) {
    console.error('[AnalyticsService] getCategorySales error:', error?.message);
    return { topLevel: [], drilldown: {} };
  }

  const topMap = new Map<string, number>();
  const drillMap = new Map<string, Map<string, number>>();

  for (const item of data as any[]) {
    const revenue = item.quantity * Number(item.unit_price_at_purchase);
    const parentGroup = item.product?.category?.parent_group as string;
    const categoryName = item.product?.category?.name as string;

    if (!parentGroup || !categoryName) continue;

    // Top level
    topMap.set(parentGroup, (topMap.get(parentGroup) || 0) + revenue);

    // Drilldown
    if (!drillMap.has(parentGroup)) {
      drillMap.set(parentGroup, new Map());
    }
    const sub = drillMap.get(parentGroup)!;
    sub.set(categoryName, (sub.get(categoryName) || 0) + revenue);
  }

  return {
    topLevel: Array.from(topMap.entries()).map(([name, total]) => ({
      name,
      total,
    })),
    drilldown: Object.fromEntries(
      Array.from(drillMap.entries()).map(([group, subMap]) => [
        group,
        Array.from(subMap.entries()).map(([name, total]) => ({ name, total })),
      ])
    ),
  };
}

/**
 * Get a sales summary for a specific date range (for Telegram alerts).
 */
export async function getSalesSummary(
  startDate: Date,
  endDate: Date
): Promise<{
  totalRevenue: number;
  orderCount: number;
  topProducts: { name: string; revenue: number; quantity: number }[];
}> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total_amount')
    .eq('status', 'paid')
    .gte('placed_at', startDate.toISOString())
    .lte('placed_at', endDate.toISOString());

  if (error || !orders) {
    return { totalRevenue: 0, orderCount: 0, topProducts: [] };
  }

  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number(o.total_amount),
    0
  );

  // Top products in this period
  const orderIds = orders.map((o) => o.id);
  let topProducts: { name: string; revenue: number; quantity: number }[] = [];

  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        quantity,
        unit_price_at_purchase,
        product:products!inner ( name )
      `)
      .in('order_id', orderIds);

    if (items) {
      const productMap = new Map<
        string,
        { revenue: number; quantity: number }
      >();
      for (const item of items as any[]) {
        const name = item.product?.name as string;
        if (!name) continue;
        const existing = productMap.get(name) || { revenue: 0, quantity: 0 };
        existing.revenue +=
          item.quantity * Number(item.unit_price_at_purchase);
        existing.quantity += item.quantity;
        productMap.set(name, existing);
      }
      topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }
  }

  return { totalRevenue, orderCount: orders.length, topProducts };
}

/**
 * Get low stock products (below threshold).
 */
export async function getLowStockProducts(
  threshold = 10
): Promise<{ id: string; name: string; stock_quantity: number }[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock_quantity')
    .eq('is_active', true)
    .lte('stock_quantity', threshold)
    .order('stock_quantity', { ascending: true });

  if (error) {
    console.error('[AnalyticsService] getLowStockProducts error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Get stuck orders — pending for more than X minutes.
 */
export async function getStuckOrders(
  minutesThreshold = 30
): Promise<{ id: string; customer_name: string; placed_at: string; total_amount: number }[]> {
  const cutoff = new Date(
    Date.now() - minutesThreshold * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, placed_at, total_amount')
    .eq('status', 'pending')
    .lte('placed_at', cutoff)
    .order('placed_at', { ascending: true });

  if (error) {
    console.error('[AnalyticsService] getStuckOrders error:', error.message);
    return [];
  }

  return data || [];
}

// Helpers

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
