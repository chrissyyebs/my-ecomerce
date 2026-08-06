import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
  const minimalOrder = {
    customer_id: "test_cust_123",
    status: "pending",
    total_amount: 100,
    delivery_method: "door",
    delivery_fee: 15,
    customer_email: "test@example.com",
    customer_name: "Test User",
  };

  const { data, error } = await supabase.from('orders').insert(minimalOrder).select();
  console.log('Minimal Insert Result:', { data, error });
}

testInsert();
