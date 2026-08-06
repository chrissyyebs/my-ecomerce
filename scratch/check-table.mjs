import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkOtpTable() {
  console.log('Checking if otp_codes table exists...');
  const { data, error } = await supabase.from('otp_codes').select('id').limit(1);
  
  if (error && error.message.includes('does not exist')) {
    console.log('❌ Table "otp_codes" does NOT exist.');
  } else if (error) {
    console.log('⚠️  otp_codes query error:', error.message);
  } else {
    console.log('✅ Table "otp_codes" EXISTS! Current rows:', data?.length ?? 0);
  }

  // Also check if client_users has correct columns
  console.log('\nChecking client_users table schema...');
  const { data: colData, error: colError } = await supabase
    .from('client_users')
    .select('*')
    .limit(0);
  
  if (colError) {
    console.log('⚠️  client_users error:', colError.message);
  } else {
    console.log('✅ client_users table accessible and has 0 rows');
  }

  // Try inserting a test and immediately deleting
  console.log('\nTesting insert into client_users...');
  const { data: insertData, error: insertError } = await supabase
    .from('client_users')
    .insert({
      full_name: 'Test User',
      email: 'test_delete_me@gmail.com',
      password_hash: '$2a$10$testhashabcdefg1234567890',
      phone: '0001112222',
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    if (insertError.message.includes('password_hash')) {
      console.log('   → The "password_hash" column may be missing. Please re-run 003_client_users.sql.');
    }
  } else {
    console.log('✅ Insert succeeded! ID:', insertData?.id);
    // Clean up test row
    await supabase.from('client_users').delete().eq('email', 'test_delete_me@gmail.com');
    console.log('✅ Test row cleaned up.');
  }
}

checkOtpTable();
