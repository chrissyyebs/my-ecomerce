import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE URL:', supabaseUrl);
console.log('SUPABASE KEY EXISTS:', !!supabaseServiceRoleKey);

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testCheckoutSteps() {
  const items = [{ product_id: "5b50f85c-fe9f-4f1e-8159-242aa8ecfed8", quantity: 1 }];
  const delivery_method = "door";
  const shipping_address = { address: "123 Main St", city: "New York", state: "NY" };
  const customer_email = "test@example.com";
  const customer_name = "Test User";
  const customer_phone = null;
  const customerId = "guest_12345";

  console.log('Step 1: fetching products...');
  const productIds = items.map((i) => i.product_id);
  const { data: dbProducts, error: dbErr } = await supabase
    .from('products')
    .select('id, name, price, stock_quantity, is_active')
    .in('id', productIds)
    .eq('is_active', true);

  console.log('Step 1 result:', { dbProducts, dbErr });

  console.log('Step 2: stock decrement...');
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  for (const item of items) {
    const currentStock = productMap.get(item.product_id).stock_quantity;
    const { error: updateErr } = await supabase
      .from('products')
      .update({ stock_quantity: currentStock - item.quantity })
      .eq('id', item.product_id)
      .gte('stock_quantity', item.quantity);
    console.log('Stock update error:', updateErr);
  }

  console.log('Step 3: inserting order...');
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
      payment_reference: paymentRef,
    })
    .select()
    .single();

  console.log('Order insert result:', { order, orderErr });

  if (orderErr) return;

  console.log('Step 4: inserting order items...');
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
}

testCheckoutSteps().catch(console.error);
