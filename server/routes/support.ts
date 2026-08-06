// ============================================================
// Support Chat Routes
// Dashboard <-> Supabase Realtime <-> Telegram bridge
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { relayCustomerMessage } from '../services/telegram.service.js';
import { getAuth } from '@clerk/express';

const router = Router();

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
});

/**
 * POST /api/support/conversations
 * Get or create a support conversation for the authenticated customer
 */
router.post('/conversations', requireAuth, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const customerId = auth.userId!;
    const { name, email } = req.body;

    // Check for open conversation
    const { data: existing } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (existing) {
      res.json({ conversation: existing });
      return;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('support_conversations')
      .insert({
        customer_id: customerId,
        customer_name: name || 'Customer',
        customer_email: email || null,
        status: 'open',
      })
      .select()
      .single();

    if (error || !newConv) throw error;

    res.status(201).json({ conversation: newConv });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/support/conversations/:id/messages
 * Get message history for a conversation
 */
router.get('/conversations/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const customerId = auth.userId!;
    const id = req.params.id as string;

    // Verify ownership
    const { data: conv } = await supabase
      .from('support_conversations')
      .select('customer_id')
      .eq('id', id)
      .single();

    if (!conv) throw notFound('Conversation');

    if (conv.customer_id !== customerId) {
      throw badRequest('Access denied');
    }

    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ messages: messages || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/support/conversations/:id/messages
 * Customer sends a message -> Writes row (Supabase Realtime pushes to customer UI) -> Relays to Telegram
 */
router.post('/conversations/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const customerId = auth.userId!;
    const id = req.params.id as string;

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Message content required');

    const { data: conv } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (!conv) throw notFound('Conversation');

    if (conv.customer_id !== customerId) {
      throw badRequest('Access denied');
    }

    // Insert message into DB (Supabase Realtime will automatically emit this row)
    const { data: message, error } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: id,
        sender: 'customer',
        sender_id: customerId,
        content: parsed.data.content,
      })
      .select()
      .single();

    if (error || !message) throw error;

    // Relay customer message to Telegram Admin
    await relayCustomerMessage({
      customerName: conv.customer_name,
      customerEmail: conv.customer_email || undefined,
      message: parsed.data.content,
      conversationId: id,
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/support/public-message
 * Public relay — NO Clerk auth required.
 * Used by the chat widget for guest/unauthenticated customers.
 * - Upserts a support_conversations row (customer_id = conversationId for guests)
 * - Inserts the message into support_messages
 * - Relays to Telegram with the REAL Supabase conversation UUID
 */
const publicMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  customerName: z.string().min(1).max(100).default('Guest'),
  customerEmail: z.string().email().optional(),
  conversationId: z.string().min(1),
});

router.post('/public-message', async (req, res, next) => {
  try {
    const parsed = publicMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid message data');
    }

    const { content, customerName, customerEmail, conversationId } = parsed.data;

    // Step 1: Find or create a conversation row in Supabase
    // We use customer_id = conversationId so guest sessions persist across messages
    let conv: { id: string } | null = null;

    const { data: existing } = await supabase
      .from('support_conversations')
      .select('id')
      .eq('customer_id', conversationId)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      conv = existing;
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from('support_conversations')
        .insert({
          customer_id: conversationId,        // guest session token as customer_id
          customer_name: customerName,
          customer_email: customerEmail || null,
          status: 'open',
        })
        .select('id')
        .single();

      if (convErr || !newConv) {
        console.error('[Support] Failed to create conversation:', convErr?.message);
        // Still relay to Telegram even if DB insert fails
      } else {
        conv = newConv;
      }
    }

    // Step 2: Insert the customer message into support_messages
    if (conv) {
      await supabase.from('support_messages').insert({
        conversation_id: conv.id,
        sender: 'customer',
        sender_id: conversationId,
        content,
      });
    }

    // Step 3: Relay to Telegram — use the REAL Supabase UUID if available
    const replyConvId = conv?.id || conversationId;
    await relayCustomerMessage({
      customerName,
      customerEmail,
      message: content,
      conversationId: replyConvId,
    });

    res.status(200).json({ success: true, conversationId: replyConvId });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/support/public-messages/:conversationId
 * Public polling endpoint to retrieve messages (including admin replies from Telegram)
 */
router.get('/public-messages/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Find conversation UUID if guest token passed, or use directly if it's already UUID
    let targetConvId = conversationId;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
    if (!isUuid) {
      const { data: conv } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('customer_id', conversationId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (conv) {
        targetConvId = conv.id;
      } else {
        res.json({ messages: [] });
        return;
      }
    }

    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', targetConvId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ messages: messages || [] });
  } catch (err) {
    next(err);
  }
});

export const supportRouter = router;
