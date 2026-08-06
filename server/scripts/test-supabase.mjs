import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: resolve(process.cwd(), 'server/.env.local') });

const url = 'https://vwdkgoczphiokurqlska.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', url);

if (!url || !key) {
  console.error('Missing URL or Service Role Key!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  try {
    // 1. Test Categories table
    console.log('\n--- 1. Testing categories table ---');
    const { data: cats, error: catErr } = await supabase.from('categories').select('*');
    if (catErr) {
      console.error('Categories error:', catErr);
    } else {
      console.log('Categories count in DB:', cats?.length);
      console.log('Categories:', cats);
    }

    // 2. Test Inserting a Category
    console.log('\n--- 2. Testing category insert ---');
    const { data: newCat, error: insertCatErr } = await supabase
      .from('categories')
      .insert({ name: 'Test Category ' + Date.now(), parent_group: 'bags', is_active: true })
      .select()
      .single();
    if (insertCatErr) {
      console.error('Category insert error:', insertCatErr);
    } else {
      console.log('Successfully created test category:', newCat);
    }

    // 3. Test Storage Bucket product-images
    console.log('\n--- 3. Testing product-images storage bucket ---');
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) {
      console.error('List buckets error:', bucketErr);
    } else {
      console.log('Buckets found:', buckets?.map((b) => b.name));
      const hasProductBucket = buckets?.some((b) => b.name === 'product-images');
      console.log('Has product-images bucket:', hasProductBucket);
    }

    // 4. Test uploading a dummy file to product-images
    console.log('\n--- 4. Testing image upload to product-images bucket ---');
    const dummyBuffer = Buffer.from('fake image content');
    const testPath = `test/test-${Date.now()}.txt`;
    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(testPath, dummyBuffer, { contentType: 'text/plain', upsert: true });

    if (uploadErr) {
      console.error('Upload error:', uploadErr.message);
    } else {
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(testPath);
      console.log('Upload success! Public URL:', urlData.publicUrl);
    }

    // 5. Test Products Table
    console.log('\n--- 5. Testing products table ---');
    const { data: prods, error: prodErr } = await supabase.from('products').select('*, category:categories(*)');
    if (prodErr) {
      console.error('Products error:', prodErr);
    } else {
      console.log('Products count in DB:', prods?.length);
      console.log('Products:', prods);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

test();
