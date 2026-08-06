// ============================================================
// Admin Management Routes
// Explicit admin endpoints required by Section 6 (super_admin only)
// ============================================================

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { logAction } from '../services/audit.service.js';
import { getAuth } from '@clerk/express';
import { uploadProductImage, uploadCategoryImage } from '../services/storage.service.js';

const router = Router();

/**
 * POST /api/admin/verify-password
 * Verifies admin password for secret portal access
 */
router.post('/verify-password', (req, res, next) => {
  try {
    const { password } = req.body;
    const expectedPassword = process.env.ADMIN_DASHBOARD_PASSWORD;

    if (!expectedPassword || password === expectedPassword) {
      res.json({ success: true, message: 'Password verified' });
    } else {
      throw badRequest('Incorrect admin password');
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/admins
 * List all admins (super_admin only)
 */
router.get(
  '/admins',
  requireAuth,
  requireRole('super_admin'),
  async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ admins: data || [] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/admins
 * Add a new admin (super_admin only)
 */
router.post(
  '/admins',
  requireAuth,
  requireRole('super_admin'),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const schema = z.object({
        clerk_user_id: z.string().min(1, 'Clerk user ID is required'),
        role: z.enum(['admin', 'super_admin']).default('admin'),
        telegram_chat_id: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest(parsed.error.issues[0]?.message || 'Invalid input');
      }

      const { data, error } = await supabase
        .from('admins')
        .insert({
          clerk_user_id: parsed.data.clerk_user_id,
          role: parsed.data.role,
          telegram_chat_id: parsed.data.telegram_chat_id || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await logAction(auth.userId!, 'create', 'admin', data.id, {
        target_clerk_id: data.clerk_user_id,
        role: data.role,
      });

      res.status(201).json({ admin: data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/admin/admins/:id/role
 * Change an admin's role (super_admin only)
 */
router.put(
  '/admins/:id/role',
  requireAuth,
  requireRole('super_admin'),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const id = req.params.id as string;
      const schema = z.object({
        role: z.enum(['admin', 'super_admin']),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) throw badRequest('Valid role required (admin or super_admin)');

      const { data, error } = await supabase
        .from('admins')
        .update({ role: parsed.data.role })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) throw notFound('Admin');

      await logAction(auth.userId!, 'update', 'admin', id, { new_role: parsed.data.role });

      res.json({ admin: data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/admin/admins/:id/deactivate
 * Soft-remove an admin (super_admin only)
 */
router.put(
  '/admins/:id/deactivate',
  requireAuth,
  requireRole('super_admin'),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const id = req.params.id as string;

      const { data, error } = await supabase
        .from('admins')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) throw notFound('Admin');

      await logAction(auth.userId!, 'delete', 'admin', id, { deactivated: true });

      res.json({ message: 'Admin account deactivated', admin: data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/admin/admins/:id/telegram
 * Link/update admin's Telegram chat_id (super_admin only)
 */
router.put(
  '/admins/:id/telegram',
  requireAuth,
  requireRole('super_admin'),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const id = req.params.id as string;
      const schema = z.object({
        telegram_chat_id: z.string().min(1, 'Telegram Chat ID required'),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) throw badRequest('Valid telegram_chat_id required');

      const { data, error } = await supabase
        .from('admins')
        .update({ telegram_chat_id: parsed.data.telegram_chat_id })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) throw notFound('Admin');

      await logAction(auth.userId!, 'update', 'admin', id, {
        telegram_chat_id: parsed.data.telegram_chat_id,
      });

      res.json({ admin: data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * View audit trail entries
 */
router.get(
  '/audit-logs',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      res.json({ audit_logs: data || [] });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// Password-only Category & Product Management
// (No Clerk required — admin portal uses password auth)
// ============================================================

/**
 * GET /api/admin/categories
 * List all categories (public fallback, no auth needed)
 */
router.get('/categories', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json({ categories: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * Multer for category image upload
 */
const categoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

/**
 * POST /api/admin/categories
 * Create category with optional image — any parent_group allowed
 */
router.post('/categories', categoryUpload.single('image'), async (req, res, next) => {
  try {
    const { name, parent_group } = req.body;
    console.log('\n📁 [ADMIN] POST /categories — Creating category...');
    console.log('   Name:', name, '| Parent Group:', parent_group);
    console.log('   Image attached:', req.file ? req.file.originalname : '(none)');

    if (!name) {
      console.log('   ❌ REJECTED: Missing name');
      return res.status(400).json({ error: true, message: 'Category name is required' });
    }

    // Use the name as parent_group if none provided
    const group = (parent_group || name).trim().toLowerCase();

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), parent_group: group, is_active: true })
      .select()
      .single();

    if (error) {
      console.error('   ❌ SUPABASE ERROR creating category:', error.message);
      throw error;
    }

    // Upload image if provided
    let imageUrl: string | null = null;
    if (req.file && data) {
      try {
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const filename = `${Date.now()}.${ext}`;
        const { publicUrl } = await uploadCategoryImage(data.id, filename, req.file.buffer, req.file.mimetype);
        imageUrl = publicUrl;
        console.log('   🖼️  Image uploaded:', publicUrl);

        // Update category with image_url
        await supabase.from('categories').update({ image_url: imageUrl }).eq('id', data.id);
        data.image_url = imageUrl;
      } catch (imgErr: any) {
        console.error('   ⚠️  Image upload failed (category still created):', imgErr?.message);
      }
    }

    console.log('   ✅ CATEGORY SAVED TO DB:', JSON.stringify(data, null, 2));
    res.status(201).json({ category: data });
  } catch (err) {
    console.error('   ❌ CATEGORY CREATE FAILED:', err);
    next(err);
  }
});

/**
 * PUT /api/admin/categories/:id
 * Update category name and/or image
 */
router.put('/categories/:id', categoryUpload.single('image'), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { name, parent_group } = req.body;
    console.log('\n📝 [ADMIN] PUT /categories/' + id + ' — Updating category...');
    console.log('   New Name:', name, '| New Parent Group:', parent_group);
    console.log('   New image:', req.file ? req.file.originalname : '(none)');

    const update: Record<string, any> = {};
    if (name) update.name = name.trim();
    if (parent_group) update.parent_group = parent_group.trim().toLowerCase();

    // Upload image if provided
    if (req.file) {
      try {
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const filename = `${Date.now()}.${ext}`;
        const { publicUrl } = await uploadCategoryImage(id, filename, req.file.buffer, req.file.mimetype);
        update.image_url = publicUrl;
        console.log('   🖼️  New image uploaded:', publicUrl);
      } catch (imgErr: any) {
        console.error('   ⚠️  Image upload failed:', imgErr?.message);
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('   ❌ CATEGORY UPDATE FAILED:', error?.message || 'Not found');
      return res.status(404).json({ error: true, message: 'Category not found' });
    }
    console.log('   ✅ CATEGORY UPDATED IN DB:', JSON.stringify(data, null, 2));
    res.json({ category: data });
  } catch (err) {
    console.error('   ❌ CATEGORY UPDATE ERROR:', err);
    next(err);
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Hard-delete category — blocks if active products reference it
 */
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('\n🗑️  [ADMIN] DELETE /categories/' + id + ' — Hard-deleting category...');

    // Block if active products exist in category
    const { count, error: countErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true);

    if (countErr) throw countErr;
    if (count && count > 0) {
      console.log('   ❌ BLOCKED: ' + count + ' active product(s) still in this category');
      return res.status(400).json({
        error: true,
        message: `Cannot delete category: ${count} active product(s) still reference it.`,
      });
    }

    // Get info before deletion
    const { data: existing } = await supabase.from('categories').select('id, name').eq('id', id).single();

    // Delete image from storage if present
    if (existing) {
      await supabase.storage.from('product-images').remove([`categories/${id}`]);
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('   ❌ CATEGORY DELETE FAILED:', error.message);
      return res.status(500).json({ error: true, message: error.message });
    }
    console.log('   ✅ CATEGORY HARD-DELETED FROM DB:', existing?.name || id);
    res.json({ message: 'Category deleted', category: existing });
  } catch (err) {
    console.error('   ❌ CATEGORY DELETE ERROR:', err);
    next(err);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Hard-delete product + clean up images from DB and bucket
 */
router.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('\n🗑️  [ADMIN] DELETE /products/' + id + ' — Hard-deleting product...');

    // First, get product info for logging
    const { data: existing } = await supabase.from('products').select('id, name, price').eq('id', id).single();
    if (!existing) {
      console.error('   ❌ PRODUCT NOT FOUND in DB for id:', id);
      return res.status(404).json({ error: true, message: 'Product not found' });
    }

    // Delete images from bucket
    const { data: images } = await supabase.from('product_images').select('bucket_path').eq('product_id', id);
    if (images && images.length > 0) {
      const paths = images.map(i => i.bucket_path);
      console.log('   🖼️  Removing', paths.length, 'image(s) from storage...');
      await supabase.storage.from('product-images').remove(paths);
    }

    // Delete image records
    await supabase.from('product_images').delete().eq('product_id', id);

    // Hard-delete the product from DB
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error('   ❌ PRODUCT DELETE FAILED:', error.message);
      return res.status(500).json({ error: true, message: error.message });
    }

    console.log('   ✅ PRODUCT HARD-DELETED FROM DB:', existing.name, '($' + existing.price + ', id:', existing.id + ')');
    res.json({ message: 'Product deleted', product: existing });
  } catch (err) {
    console.error('   ❌ PRODUCT DELETE ERROR:', err);
    next(err);
  }
});

async function resolveOrCreateCategoryId(categoryId?: string, categoryName?: string): Promise<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (categoryId && uuidRegex.test(categoryId)) {
    const { data } = await supabase.from('categories').select('id').eq('id', categoryId).single();
    if (data?.id) return data.id;
  }

  const targetName = (categoryName || 'Bags').trim();
  const { data: existing } = await supabase
    .from('categories')
    .select('id, is_active')
    .ilike('name', targetName)
    .limit(1);

  if (existing && existing.length > 0) {
    if (!existing[0].is_active) {
      await supabase.from('categories').update({ is_active: true }).eq('id', existing[0].id);
    }
    return existing[0].id;
  }

  const parentGroup = targetName.toLowerCase();
  const { data: created, error: createErr } = await supabase
    .from('categories')
    .insert({ name: targetName, parent_group: parentGroup, is_active: true })
    .select('id')
    .single();

  if (created?.id) return created.id;
  if (createErr) console.error('[admin resolveOrCreateCategoryId] insert error:', createErr.message);

  const { data: fallback } = await supabase.from('categories').select('id').limit(1);
  if (fallback && fallback.length > 0) return fallback[0].id;

  throw new Error(`Failed to resolve category ID for name "${targetName}"`);
}

/**
 * POST /api/admin/products — Create product with image upload to Supabase bucket
 */
const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

router.post('/products', adminUpload.array('images', 5), async (req, res, next) => {
  try {
    const { name, description, price, category_id, categoryName, materials, stock_quantity, image } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];

    console.log('\n📦 [ADMIN] POST /products — Creating new product...');
    console.log('   Name:', name);
    console.log('   Price:', price, '| Stock:', stock_quantity);
    console.log('   Category:', categoryName || category_id || '(none)');
    console.log('   Materials:', materials || '(none)');
    console.log('   Image files attached:', files.length);

    if (!name || price === undefined || price === '') {
      console.log('   ❌ REJECTED: Missing name or price');
      return res.status(400).json({ error: true, message: 'name and price are required' });
    }

    console.log('   🔍 Resolving category UUID...');
    const validCategoryId = await resolveOrCreateCategoryId(category_id, categoryName);
    console.log('   ✅ Category UUID:', validCategoryId);

    console.log('   💾 Inserting product into Supabase products table...');
    const { data: product, error: productErr } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        description: description || '',
        price: parseFloat(price),
        category_id: validCategoryId,
        materials: materials ? (Array.isArray(materials) ? materials : materials.split(',').map((s: string) => s.trim())) : null,
        stock_quantity: parseInt(stock_quantity || '0', 10),
        is_active: true,
      })
      .select(`*, category:categories(*)`)
      .single();

    if (productErr || !product) {
      console.error('   ❌ SUPABASE ERROR creating product:', productErr?.message || 'Unknown error');
      throw productErr || new Error('Failed to create product in DB');
    }
    console.log('   ✅ PRODUCT SAVED TO DB! ID:', product.id);
    console.log('      Name:', product.name, '| Price: $' + product.price);
    console.log('      Category:', product.category?.name);

    const uploadedImages: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `${Date.now()}-${i}.${ext}`;
      console.log('   🖼️  Uploading image', i + 1, '/', files.length, '(' + file.originalname + ',', (file.size / 1024).toFixed(1) + 'KB)...');
      try {
        const { bucketPath, publicUrl } = await uploadProductImage(
          product.id, filename, file.buffer, file.mimetype
        );
        console.log('      ✅ Uploaded to bucket:', bucketPath);
        console.log('      🔗 Public URL:', publicUrl);
        const { data: imgRow } = await supabase
          .from('product_images')
          .insert({ product_id: product.id, bucket_path: bucketPath, public_url: publicUrl, sort_order: i })
          .select()
          .single();
        if (imgRow) {
          uploadedImages.push(imgRow);
          console.log('      ✅ Image record saved to product_images table');
        }
      } catch (imgErr: any) {
        console.error('      ❌ Image upload failed:', imgErr?.message || imgErr);
      }
    }

    const mainImageUrl = uploadedImages[0]?.public_url || image || null;
    console.log('   🏁 DONE! Main image URL:', mainImageUrl || '(none)');
    console.log('   📊 Total images uploaded:', uploadedImages.length);

    res.status(201).json({
      product: {
        ...product,
        image: mainImageUrl,
        categoryName: product.category?.name || categoryName || 'Bags',
        images: uploadedImages,
      },
    });
  } catch (err) {
    console.error('   ❌ PRODUCT CREATE FAILED:', err);
    next(err);
  }
});

/**
 * PUT /api/admin/products/:id
 * Update product with optional new images
 */
router.put('/products/:id', adminUpload.array('images', 5), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { name, description, price, category_id, categoryName, materials, stock_quantity, image } = req.body;

    const update: Record<string, any> = {};
    if (name) update.name = name.trim();
    if (description !== undefined) update.description = description;
    if (price !== undefined && price !== '') update.price = parseFloat(price);
    if (category_id || categoryName) {
      update.category_id = await resolveOrCreateCategoryId(category_id, categoryName);
    }
    if (materials !== undefined) {
      update.materials = materials ? (Array.isArray(materials) ? materials : materials.split(',').map((s: string) => s.trim())) : null;
    }
    if (stock_quantity !== undefined && stock_quantity !== '') {
      update.stock_quantity = parseInt(stock_quantity, 10);
    }

    const { data, error } = await supabase
      .from('products')
      .update(update)
      .eq('id', id)
      .select(`*, category:categories(*)`)
      .single();

    if (error || !data) return res.status(404).json({ error: true, message: 'Product not found' });

    const uploadedImages: any[] = [];
    const files = (req.files as Express.Multer.File[]) || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `${Date.now()}-${i}.${ext}`;
      try {
        const { bucketPath, publicUrl } = await uploadProductImage(
          id, filename, file.buffer, file.mimetype
        );
        const { data: imgRow } = await supabase
          .from('product_images')
          .insert({ product_id: id, bucket_path: bucketPath, public_url: publicUrl, sort_order: i })
          .select()
          .single();
        if (imgRow) uploadedImages.push(imgRow);
      } catch (imgErr) {
        console.error('[admin products update] image error:', imgErr);
      }
    }

    const mainImageUrl = uploadedImages[0]?.public_url || image || data.image || null;

    res.json({
      product: {
        ...data,
        image: mainImageUrl,
        categoryName: data.category?.name || categoryName || 'Bags',
        images: uploadedImages,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const adminManagementRouter = router;
