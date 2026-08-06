// ============================================================
// Telegram Webhook Function (Vercel Serverless)
// Webhook Mode Only — Handles admin replies & inline buttons
// Fast ACK (200 OK) then background processing
// ============================================================

import { loadServerEnv } from '../../server/config/env.js';
loadServerEnv();

import type { Request, Response } from 'express';
import { supabase } from '../../server/config/supabase.js';
import { answerCallbackQuery, sendMessage } from '../../server/services/telegram.service.js';
import { logAction } from '../../server/services/audit.service.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  // Always acknowledge immediately to Telegram with 200 OK
  res.status(200).send('OK');

  if (req.method !== 'POST') return;

  try {
    const update = req.body;
    if (!update) return;

    // Handle Callback Queries (Inline Button Taps, e.g. order status actions)
    if (update.callback_query) {
      const cb = update.callback_query;
      const dataStr = cb.data || '';
      const chatId = String(cb.message?.chat_id || cb.from.id);

      await answerCallbackQuery(cb.id, 'Processing action...');

      // Format: action:order_id (e.g., "confirm_order:uuid" or "cancel_order:uuid")
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

    // Handle Messages (Admin text replies to customer support)
    if (update.message && update.message.text) {
      const msg = update.message;
      const text = msg.text;

      // Check if text starts with a conversation command or reply context
      // Format: /reply <conv_id> <message> OR replying to a customer message tag
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
            // Write admin message to support_messages (Supabase Realtime triggers push to customer UI)
            await supabase.from('support_messages').insert({
              conversation_id: conv.id,
              sender: 'admin',
              sender_id: `telegram_admin_${msg.from.id}`,
              content: replyText,
            });

            await sendMessage(String(msg.chat.id), `✉️ Reply sent to customer in conversation <code>${convId.slice(0, 8)}</code>.`);
          } else {
            await sendMessage(String(msg.chat.id), `⚠️ Conversation ID <code>${convId}</code> not found.`);
          }
        }
      } else if (text === '/inventory') {
        // Command /inventory
        const { count, error } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);

        if (!error) {
          await sendMessage(String(msg.chat.id), `📦 Current active product count in catalog: <b>${count || 0}</b>`);
        }
      }
    }
  } catch (err) {
    console.error('[TelegramWebhook] Handler error:', err);
  }
}
