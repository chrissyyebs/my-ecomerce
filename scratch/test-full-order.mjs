import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullOrder() {
  const items = [{ product_id: "5b50f85c-fe9f-4f1e-8159-242aa8ecfed8", quantity: 1 }];
  const delivery_method = "door";
  const shipping_address = { address: "123 Main St", city: "New York", state: "NY" };
  const customer_email = "test@example.com";
  const customer_name = "Test User";
  const customer_phone = null;
  const customerId = "guest_12345";

  const productIds = items.map((i) => i.product_id);
  const { data: dbProducts } = await supabase
    .from('products')
    .select('id, name, price, stock_quantity, is_active')
    .in('id', productIds)
    .eq('is_active', true);

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  const paymentRef = `TTL-REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'pending',
      total_amount: 365,
      delivery_method,
      delivery_fee: 15,
      shipping_address: shipping_address || null,
      customer_email,
      customer_name,
      customer_phone: customer_phone || null,
      paystack_reference: paymentRef,
    })
    .select()
    .single();

  console.log('Order insert result:', { order, orderErr });

  if (orderErr) return;

  const orderItemRows = items.map((item) => {
    const prod = productMap.get(item.product_id);
    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price_at_purchase: prod.price,
      selected_size: null,
      selected_color: null,
    };
  });

  const { data: itemsData, error: itemsErr } = await supabase.from('order_items').insert(orderItemRows).select();
  console.log('Order items insert result:', { itemsData, itemsErr });

  // Cleanup
  await supabase.from('orders').delete().eq('id', order.id);
  console.log('Cleaned up test order');
}

testFullOrder().catch(console.error);
