// ============================================================
// Product Routes
// Public catalog endpoints & Admin CRUD
// Strict upload order: Create product first -> get id -> upload memory images to bucket -> save product_images rows
// ============================================================

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { uploadProductImage, deleteAllProductImages } from '../services/storage.service.js';
import { logAction } from '../services/audit.service.js';
import { getAuth } from '@clerk/express';

const router = Router();

// Memory storage ONLY for serverless execution
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  category_id: z.string().uuid('Valid category ID required'),
  size: z.string().optional().nullable(),
  colors: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }),
  materials: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }),
  stock_quantity: z.coerce.number().int().min(0, 'Stock cannot be negative').default(0),
});

/**
 * GET /api/products
 * Public listing of active products with images & category
 */
router.get('/', async (req, res, next) => {
  try {
    const { category_id, parent_group, search } = req.query;

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category_id) {
      query = query.eq('category_id', String(category_id));
    }

    if (parent_group) {
      query = query.eq('category.parent_group', String(parent_group));
    }

    if (search) {
      query = query.ilike('name', `%${String(search)}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((p: any) => ({
      ...p,
      categoryName: p.category?.name || 'Bags',
      image: p.images?.[0]?.public_url || p.image || null,
    }));

    res.json({ products: formatted });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/:id
 * Public detail view for single product
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) throw notFound('Product');

    res.json({ product: data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/products
 * Create product row FIRST, then upload memory image buffers to bucket, then insert image rows
 */
router.post(
  '/admin',
  requireAuth,
  requireRole('admin', 'super_admin'),
  upload.array('images', 5),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const parsed = productSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest(parsed.error.issues[0]?.message || 'Invalid product data');
      }

      // Step 1: Create product row FIRST to obtain product ID
      const { data: product, error: productErr } = await supabase
        .from('products')
        .insert({
          name: parsed.data.name,
          description: parsed.data.description,
          price: parsed.data.price,
          category_id: parsed.data.category_id,
          size: parsed.data.size || null,
          colors: parsed.data.colors || null,
          materials: parsed.data.materials || null,
          stock_quantity: parsed.data.stock_quantity,
          is_active: true,
        })
        .select()
        .single();

      if (productErr || !product) {
        throw productErr || new Error('Failed to create product row');
      }

      const uploadedImages = [];
      const files = (req.files as Express.Multer.File[]) || [];

      // Step 2: Upload image buffers to Supabase storage under `products/{product_id}/...`
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.originalname.split('.').pop() || 'jpg';
        const filename = `${Date.now()}-${i}.${fileExt}`;

        const { bucketPath, publicUrl } = await uploadProductImage(
          product.id,
          filename,
          file.buffer,
          file.mimetype
        );

        // Step 3: Insert product_images row
        const { data: imgRow, error: imgErr } = await supabase
          .from('product_images')
          .insert({
            product_id: product.id,
            bucket_path: bucketPath,
            public_url: publicUrl,
            sort_order: i,
          })
          .select()
          .single();

        if (!imgErr && imgRow) {
          uploadedImages.push(imgRow);
        }
      }

      await logAction(auth.userId!, 'create', 'product', product.id, { name: product.name });

      res.status(201).json({
        product: {
          ...product,
          images: uploadedImages,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/admin/products/:id
 * Update product info
 */
router.put(
  '/admin/:id',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const id = req.params.id as string;
      const parsed = productSchema.partial().safeParse(req.body);

      if (!parsed.success) {
        throw badRequest(parsed.error.issues[0]?.message || 'Invalid update data');
      }

      const { data, error } = await supabase
        .from('products')
        .update(parsed.data)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) throw notFound('Product');

      await logAction(auth.userId!, 'update', 'product', id, parsed.data);

      res.json({ product: data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/admin/products/:id
 * Soft delete product (`is_active = false`), delete storage bucket files, AND clean up product_images rows
 */
router.delete(
  '/admin/:id',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const id = req.params.id as string;

      // 1. Soft delete product in DB
      const { data, error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) throw notFound('Product');

      // 2. Delete product_images rows to prevent orphaned records
      const { error: deleteImagesErr } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', id);

      if (deleteImagesErr) {
        console.error(`[Products] Failed to delete product_images DB rows for product ${id}:`, deleteImagesErr.message);
      }

      // 3. Hard-delete storage files from Supabase bucket
      await deleteAllProductImages(id);

      await logAction(auth.userId!, 'delete', 'product', id, { name: data.name });

      res.json({ message: 'Product soft-deleted, images DB rows removed, and storage files cleaned', product: data });
    } catch (err) {
      next(err);
    }
  }
);

export const productsRouter = router;
