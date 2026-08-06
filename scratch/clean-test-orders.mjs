import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanTestOrders() {
  const { data, error } = await supabase.from('orders').delete().eq('customer_email', 'test@example.com');
  console.log('Cleaned up test orders:', { data, error });
}

cleanTestOrders();
