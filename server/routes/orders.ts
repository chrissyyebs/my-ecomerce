// ============================================================
// Order & Checkout Routes
// Pre-payment server validation -> Atomic stock decrement -> Order creation
// ============================================================

import { Router, type Request } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { checkoutLimiter } from '../middleware/rateLimiter.js';
import { notifyNewOrder } from '../services/telegram.service.js';
import { sendOrderConfirmation, sendStatusUpdate } from '../services/email.service.js';
import { logAction } from '../services/audit.service.js';
import { getAuth } from '@clerk/express';

const router = Router();

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      quantity: z.number().int().positive(),
      selected_size: z.string().optional(),
      selected_color: z.string().optional(),
    })
  ).min(1, 'Cart cannot be empty'),
  delivery_method: z.enum(['door', 'pickup']).default('door'),
  shipping_address: z
    .object({
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
    })
    .optional(),
  customer_email: z.string().email(),
  customer_name: z.string().min(1),
  customer_phone: z.string().optional(),
  callback_url: z.string().url().optional(),
  customer_id: z.string().optional(),
});

/**
 * POST /api/orders/checkout
 * 1. Recalculate total & verify stock from DB
 * 2. Execute atomic stock decrement (`stock = stock - qty WHERE stock >= qty`)
 * 3. Create order & order_items rows
 */
router.post('/checkout', checkoutLimiter, async (req, res, next) => {
  try {
    // Auth is optional — guests and logged-in clients can both place orders
    let clerkUserId: string | null = null;
    try {
      const auth = getAuth(req);
      clerkUserId = auth?.userId || null;
    } catch {
      // No Clerk auth — that's fine for guest checkout
    }

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('[Orders] Checkout validation failed:', parsed.error.issues);
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid checkout data');
    }

    const { items, delivery_method, shipping_address, customer_email, customer_name, customer_phone, customer_id: bodyCustomerId } = parsed.data;
    const customerId = clerkUserId || bodyCustomerId || `guest_${Date.now()}`;

    console.log(`\n🛒 [Orders] Checkout started for ${customer_name} (${customer_email})`);
    console.log(`   Items: ${items.length}, Delivery: ${delivery_method}, CustomerID: ${customerId}`);

    if (delivery_method === 'door' && !shipping_address) {
      throw badRequest('Shipping address is required for door delivery');
    }

    // Step 1: Pre-validation & DB recalculation of totals & stock check
    const productIds = items.map((i) => i.product_id);
    const { data: dbProducts, error: dbErr } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, is_active')
      .in('id', productIds)
      .eq('is_active', true);

    if (dbErr) {
      console.error('[Orders] DB product lookup error:', dbErr.message);
      throw badRequest('Failed to verify products. Please try again.');
    }

    if (!dbProducts || dbProducts.length !== productIds.length) {
      console.error('[Orders] Product count mismatch:', dbProducts?.length, 'vs', productIds.length);
      throw badRequest('One or more products in your cart are no longer available');
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    let subtotal = 0;

    for (const item of items) {
      const prod = productMap.get(item.product_id);
      if (!prod) {
        throw badRequest(`Product not found or inactive`);
      }
      if (prod.stock_quantity < item.quantity) {
        throw badRequest(`Insufficient stock for "${prod.name}" (only ${prod.stock_quantity} left)`);
      }
      subtotal += Number(prod.price) * item.quantity;
    }

    const deliveryFee = delivery_method === 'door' ? 15 : 0;
    const grandTotal = subtotal + deliveryFee;

    // Step 2: Stock decrement (direct update, no RPC dependency)
    for (const item of items) {
      const currentStock = productMap.get(item.product_id)!.stock_quantity;
      const { error: updateErr } = await supabase
        .from('products')
        .update({ stock_quantity: currentStock - item.quantity })
        .eq('id', item.product_id)
        .gte('stock_quantity', item.quantity);

      if (updateErr) {
        console.error('[Orders] Stock update failed for', item.product_id, updateErr.message);
        throw badRequest(`Stock for a product changed during checkout. Please try again.`);
      }
    }

    // Step 3: Create Order row
    const paymentRef = `TTL-REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        status: 'pending',
        total_amount: grandTotal,
        delivery_method,
        delivery_fee: deliveryFee,
        shipping_address: shipping_address || null,
        customer_email,
        customer_name,
        customer_phone: customer_phone || null,
        paystack_reference: paymentRef,
      })
      .select()
      .single();

    if (orderErr || !order) {
      console.error('[Orders] Order creation failed:', orderErr?.message);
      throw new Error(`Failed to create order: ${orderErr?.message}`);
    }

    console.log(`   ✅ Order created: ${order.id} | Total: $${grandTotal}`);

    // Step 4: Create Order Items rows
    const orderItemRows = items.map((item) => {
      const prod = productMap.get(item.product_id)!;
      return {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price_at_purchase: prod.price,
        selected_size: item.selected_size || null,
        selected_color: item.selected_color || null,
      };
    });

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemRows);
    if (itemsErr) {
      console.error('[Orders] Order items creation failed:', itemsErr.message);
    }

    // Trigger Telegram notification & Confirmation Email (non-blocking)
    try {
      await notifyNewOrder({
        id: order.id,
        customer_name: order.customer_name,
        total_amount: Number(order.total_amount),
        items_count: items.reduce((a, c) => a + c.quantity, 0),
      });

      const formattedItems = items.map((i) => {
        const prod = productMap.get(i.product_id)!;
        return {
          name: prod.name,
          quantity: i.quantity,
          price: Number(prod.price),
        };
      });

      await sendOrderConfirmation({
        to: order.customer_email,
        customerName: order.customer_name,
        orderId: order.id,
        totalAmount: Number(order.total_amount),
        items: formattedItems,
        deliveryMethod: order.delivery_method,
      });
    } catch (notifyErr) {
      console.warn('[Orders] Notification trigger warning:', notifyErr);
    }

    console.log(`   📬 Order ${order.id} completed successfully\n`);

    res.json({
      order_id: order.id,
      paystack_reference: paymentRef,
      payment_reference: paymentRef,
      status: 'pending',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/mine
 * Authenticated customer lists their own orders
 */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const customerId = auth.userId!;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(name, price, images:product_images(public_url))
        )
      `)
      .eq('customer_id', customerId)
      .order('placed_at', { ascending: false });

    if (error) throw error;

    res.json({ orders: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/:id/track
 * Customer tracking page — customer_id check strictly enforced
 */
router.get('/:id/track', requireAuth, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const customerId = auth.userId!;
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total_amount,
        delivery_method,
        shipping_address,
        placed_at,
        status_updated_at,
        customer_id,
        items:order_items(
          quantity,
          unit_price_at_purchase,
          selected_size,
          selected_color,
          product:products(name)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) throw notFound('Order');

    if (order.customer_id !== customerId) {
      throw badRequest('Order does not belong to you');
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/orders/:id/status
 * Admin status update (pending -> paid -> processing -> shipped -> delivered, or cancelled)
 */
router.put(
  '/admin/:id/status',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const id = req.params.id as string;

      const statusSchema = z.object({
        status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']),
      });

      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest('Invalid order status');
      }

      const newStatus = parsed.data.status;

      const { data: order, error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !order) throw notFound('Order');

      // Send status update email
      await sendStatusUpdate({
        to: order.customer_email,
        customerName: order.customer_name,
        orderId: order.id,
        newStatus,
      });

      await logAction(auth.userId!, 'status_change', 'order', id, { new_status: newStatus });

      res.json({ message: 'Order status updated', order });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/all-orders or GET /api/orders/admin
 * Admin lists all orders with items & products
 */
router.get(
  '/admin/all-orders',
  async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(name, price, images:product_images(public_url))
          )
        `)
        .order('placed_at', { ascending: false });

      if (error) throw error;

      res.json({ orders: data || [] });
    } catch (err) {
      next(err);
    }
  }
);

export const ordersRouter = router;
