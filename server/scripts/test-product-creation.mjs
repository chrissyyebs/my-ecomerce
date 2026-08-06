import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: resolve(process.cwd(), 'server/.env.local') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Product Creation API flow to Supabase...');
console.log('URL:', url);

const supabase = createClient(url, key);

async function runTest() {
  try {
    // 1. Get or create a category
    console.log('\n--- 1. Resolving category in Supabase ---');
    let { data: cat } = await supabase.from('categories').select('*').limit(1).single();
    if (!cat) {
      const { data: createdCat, error: catErr } = await supabase
        .from('categories')
        .insert({ name: 'Luxury Bags', parent_group: 'bags', is_active: true })
        .select()
        .single();
      if (catErr) throw catErr;
      cat = createdCat;
    }
    console.log('Using category:', cat);

    // 2. Insert product
    console.log('\n--- 2. Inserting product into Supabase Postgres DB ---');
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .insert({
        name: 'Atelier Leather Tote ' + Date.now().toString().slice(-4),
        description: 'Handcrafted premium leather tote bag.',
        price: 350.00,
        category_id: cat.id,
        materials: ['Italian Bridle Leather', 'Brass Hardware'],
        stock_quantity: 15,
        is_active: true,
      })
      .select('*, category:categories(*)')
      .single();

    if (prodErr) throw prodErr;
    console.log('Product created in DB:', product);

    // 3. Upload image to Storage Bucket product-images
    console.log('\n--- 3. Uploading image to Supabase Storage bucket product-images ---');
    const sampleImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const bucketPath = `products/${product.id}/main-${Date.now()}.png`;

    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(bucketPath, sampleImageBuffer, { contentType: 'image/png', upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(bucketPath);
    console.log('Uploaded image public URL:', urlData.publicUrl);

    // 4. Save image record in product_images table
    const { data: imgRow, error: imgErr } = await supabase
      .from('product_images')
      .insert({
        product_id: product.id,
        bucket_path: bucketPath,
        public_url: urlData.publicUrl,
        sort_order: 0,
      })
      .select()
      .single();

    if (imgErr) throw imgErr;
    console.log('Product image row created in DB:', imgRow);

    // 5. Test fetching active products (Client Storefront call)
    console.log('\n--- 5. Testing GET active products for Storefront ---');
    const { data: clientProds, error: fetchErr } = await supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*)')
      .eq('is_active', true);

    if (fetchErr) throw fetchErr;
    console.log(`Storefront retrieved ${clientProds?.length} product(s) from Supabase:`);
    clientProds?.forEach((p) => {
      console.log(`- ${p.name} ($${p.price}) | Category: ${p.category?.name} | Image: ${p.images?.[0]?.public_url}`);
    });

    console.log('\n✅ ALL SUPABASE TESTS PASSED 100%! Product & Image successfully saved to Supabase DB and Storage bucket.');
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

runTest();
