import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  await supabase.from('orders').delete().eq('customer_id', 'test_cust_123');
  console.log('Cleaned up test orders');
}

cleanup();
