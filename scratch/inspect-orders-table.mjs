import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTable() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  console.log('Orders query result:', { data, error });
}

inspectTable();
