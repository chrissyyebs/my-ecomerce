import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPaystackRef() {
  const minimalOrder = {
    customer_id: "test_cust_paystack",
    status: "pending",
    total_amount: 100,
    delivery_method: "door",
    delivery_fee: 15,
    customer_email: "test@example.com",
    customer_name: "Test User",
    paystack_reference: "TTL-REF-123456"
  };

  const { data, error } = await supabase.from('orders').insert(minimalOrder).select();
  console.log('Paystack Insert Result:', { data, error });
  if (data?.[0]?.id) {
    await supabase.from('orders').delete().eq('id', data[0].id);
  }
}

testPaystackRef();
