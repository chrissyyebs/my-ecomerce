// ============================================================
// Telegram Service
// Bot message helpers — webhook mode only, no polling
// Sends alerts to all active admins (DB table + TELEGRAM_ADMIN_CHAT_ID)
// ============================================================

import { supabase } from '../config/supabase.js';

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return token;
}

/**
 * Resolves all target admin chat IDs:
 * 1. Queries active admins from DB with a non-null telegram_chat_id
 * 2. Includes process.env.TELEGRAM_ADMIN_CHAT_ID if set (e.g. group chat)
 * 3. Returns deduplicated list of chat IDs
 */
export async function getTargetAdminChatIds(): Promise<string[]> {
  const chatIds = new Set<string>();

  // 1. Check env var (e.g., main group chat or default admin)
  if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
    chatIds.add(process.env.TELEGRAM_ADMIN_CHAT_ID.trim());
  }

  // 2. Fetch from admins DB table
  try {
    const { data: admins } = await supabase
      .from('admins')
      .select('telegram_chat_id')
      .eq('is_active', true)
      .not('telegram_chat_id', 'is', null);

    if (admins) {
      for (const admin of admins) {
        if (admin.telegram_chat_id && admin.telegram_chat_id.trim()) {
          chatIds.add(admin.telegram_chat_id.trim());
        }
      }
    }
  } catch (err) {
    console.error('[TelegramService] Error fetching admin chat IDs from DB:', err);
  }

  return Array.from(chatIds);
}

/**
 * Send a text message to a specific Telegram chat.
 */
export async function sendMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<void> {
  const token = getBotToken();

  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`[TelegramService] sendMessage failed for chat ${chatId}:`, errorData);
  }
}

/**
 * Broadcast an alert to ALL resolved admin chat IDs (DB admins + group chat).
 */
export async function sendAdminAlert(text: string): Promise<void> {
  const chatIds = await getTargetAdminChatIds();

  if (chatIds.length === 0) {
    console.warn('[TelegramService] No admin chat IDs available to send alert');
    return;
  }

  await Promise.allSettled(
    chatIds.map((chatId) => sendMessage(chatId, text))
  );
}

/**
 * Send a new order notification to all admins.
 */
export async function notifyNewOrder(order: {
  id: string;
  customer_name: string;
  total_amount: number;
  items_count: number;
}): Promise<void> {
  const text = [
    '🛒 <b>New Order!</b>',
    '',
    `<b>Order:</b> <code>${order.id.slice(0, 8)}</code>`,
    `<b>Customer:</b> ${order.customer_name}`,
    `<b>Items:</b> ${order.items_count}`,
    `<b>Total:</b> $${order.total_amount.toFixed(2)}`,
  ].join('\n');

  await sendAdminAlert(text);
}

/**
 * Send a low stock warning to all admins.
 */
export async function notifyLowStock(
  products: { name: string; stock_quantity: number }[]
): Promise<void> {
  if (products.length === 0) return;

  const items = products
    .map((p) => `  • ${p.name}: <b>${p.stock_quantity}</b> left`)
    .join('\n');

  const text = [
    '⚠️ <b>Low Stock Alert</b>',
    '',
    items,
    '',
    `${products.length} product(s) below threshold`,
  ].join('\n');

  await sendAdminAlert(text);
}

/**
 * Send a sales summary to all admins.
 */
export async function notifySalesSummary(
  period: string,
  summary: {
    totalRevenue: number;
    orderCount: number;
    topProducts: { name: string; revenue: number; quantity: number }[];
  }
): Promise<void> {
  const topList =
    summary.topProducts.length > 0
      ? summary.topProducts
          .map(
            (p, i) =>
              `  ${i + 1}. ${p.name} — $${p.revenue.toFixed(2)} (${p.quantity} sold)`
          )
          .join('\n')
      : '  No sales in this period';

  const text = [
    `📊 <b>${period} Sales Summary</b>`,
    '',
    `<b>Revenue:</b> $${summary.totalRevenue.toFixed(2)}`,
    `<b>Orders:</b> ${summary.orderCount}`,
    '',
    '<b>Top Products:</b>',
    topList,
  ].join('\n');

  await sendAdminAlert(text);
}

/**
 * Send a stuck orders alert to all admins.
 */
export async function notifyStuckOrders(
  orders: { id: string; customer_name: string; placed_at: string; total_amount: number }[]
): Promise<void> {
  if (orders.length === 0) return;

  const items = orders
    .map((o) => {
      const mins = Math.round(
        (Date.now() - new Date(o.placed_at).getTime()) / 60000
      );
      return `  • <code>${o.id.slice(0, 8)}</code> — ${o.customer_name} — $${Number(o.total_amount).toFixed(2)} (${mins}min ago)`;
    })
    .join('\n');

  const text = [
    '🚨 <b>Stuck Orders Alert</b>',
    '',
    `${orders.length} order(s) still pending:`,
    items,
  ].join('\n');

  await sendAdminAlert(text);
}

/**
 * Relay a customer support message to all admin Telegram chats.
 */
export async function relayCustomerMessage(params: {
  customerName: string;
  customerEmail?: string;
  message: string;
  conversationId: string;
}): Promise<void> {
  const text = [
    '💬 <b>Customer Message</b>',
    '',
    `<b>From:</b> ${params.customerName}${params.customerEmail ? ` (${params.customerEmail})` : ''}`,
    `<b>Conv ID:</b> <code>${params.conversationId}</code>`,
    `<b>Reply via:</b> <code>/reply ${params.conversationId} &lt;your message&gt;</code>`,
    '',
    params.message,
  ].join('\n');

  await sendAdminAlert(text);
}

/**
 * Send inline keyboard buttons (for order confirm/cancel).
 */
export async function sendInlineButtons(
  chatId: string,
  text: string,
  buttons: { text: string; callback_data: string }[][]
): Promise<void> {
  const token = getBotToken();

  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[TelegramService] sendInlineButtons failed:', errorData);
  }
}

/**
 * Answer a callback query (acknowledge button tap).
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const token = getBotToken();

  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || 'Done',
    }),
  });
}
