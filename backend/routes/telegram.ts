// ============================================================
// Telegram Webhook Route Handler
// Shared between api/telegram/webhook.ts (Vercel) and backend/app.ts (local)
// ============================================================

import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { answerCallbackQuery, sendMessage } from '../services/telegram.service.js';
import { logAction } from '../services/audit.service.js';

export async function telegramWebhookHandler(req: Request, res: Response): Promise<void> {
  // Always acknowledge immediately to Telegram with 200 OK
  res.status(200).send('OK');

  if (req.method !== 'POST') return;

  try {
    const update = req.body;
    if (!update) return;

    // Handle Callback Queries (inline button taps)
    if (update.callback_query) {
      const cb = update.callback_query;
      const dataStr = cb.data || '';
      const chatId = String(cb.message?.chat?.id || cb.from.id);

      await answerCallbackQuery(cb.id, 'Processing action...');

      const [action, orderId] = dataStr.split(':');

      if (action && orderId) {
        if (action === 'confirm_order') {
          await supabase
            .from('orders')
            .update({ status: 'processing', status_updated_at: new Date().toISOString() })
            .eq('id', orderId);

          await sendMessage(chatId, `✅ Order <code>${orderId.slice(0, 8)}</code> set to <b>Processing</b>.`);
          await logAction('telegram_bot', 'status_change', 'order', orderId, { action, via: 'telegram' });

        } else if (action === 'cancel_order') {
          await supabase
            .from('orders')
            .update({ status: 'cancelled', status_updated_at: new Date().toISOString() })
            .eq('id', orderId);

          await sendMessage(chatId, `❌ Order <code>${orderId.slice(0, 8)}</code> set to <b>Cancelled</b>.`);
          await logAction('telegram_bot', 'status_change', 'order', orderId, { action, via: 'telegram' });
        }
      }
      return;
    }

    // Handle Text Commands from Admin
    if (update.message?.text) {
      const msg = update.message;
      const text = msg.text as string;
      const chatId = String(msg.chat.id);

      // /reply <conv_id> <message>
      if (text.startsWith('/reply ')) {
        const parts = text.split(' ');
        const convId = parts[1];
        const replyText = parts.slice(2).join(' ');

        if (convId && replyText) {
          const { data: conv } = await supabase
            .from('support_conversations')
            .select('id')
            .eq('id', convId)
            .single();

          if (conv) {
            await supabase.from('support_messages').insert({
              conversation_id: conv.id,
              sender: 'admin',
              sender_id: `telegram_admin_${msg.from.id}`,
              content: replyText,
            });
            await sendMessage(chatId, `✉️ Reply sent to customer in conversation <code>${convId.slice(0, 8)}</code>.`);
          } else {
            await sendMessage(chatId, `⚠️ Conversation ID <code>${convId}</code> not found.`);
          }
        }

      // /inventory command
      } else if (text === '/inventory') {
        const { count, error } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);

        if (!error) {
          await sendMessage(chatId, `📦 Active products in catalog: <b>${count ?? 0}</b>`);
        }

      // /orders command - show recent pending orders
      } else if (text === '/orders') {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        if (orders && orders.length > 0) {
          const lines = orders.map(o =>
            `• <code>${o.id.slice(0, 8)}</code> — $${o.total_amount} (${o.status})`
          ).join('\n');
          await sendMessage(chatId, `🛍 <b>Recent Pending Orders:</b>\n${lines}`);
        } else {
          await sendMessage(chatId, `✅ No pending orders right now.`);
        }
      }
    }

  } catch (err) {
    console.error('[TelegramWebhook] Handler error:', err);
  }
}
