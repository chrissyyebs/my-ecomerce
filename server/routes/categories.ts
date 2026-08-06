// ============================================================
// Category Routes
// CRUD for categories under 'bags' or 'furniture'
// Block deletion if products reference the category
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { logAction } from '../services/audit.service.js';
import { getAuth } from '@clerk/express';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  parent_group: z.enum(['bags', 'furniture'], {
    message: "parent_group must be 'bags' or 'furniture'",
  }),
});

/**
 * GET /api/categories
 * Public endpoint — list all active categories
 */
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json({ categories: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/categories/all (Admin)
 * Includes inactive categories
 */
router.get('/all', requireAuth, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ categories: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/categories
 * Create a new category
 */
router.post('/admin', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid category input');
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: parsed.data.name,
        parent_group: parsed.data.parent_group,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    await logAction(auth.userId!, 'create', 'category', data.id, { name: data.name });

    res.status(201).json({ category: data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/categories/:id
 * Update category details
 */
router.put('/admin/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const id = req.params.id as string;
    const parsed = categorySchema.partial().safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid category update');
    }

    const { data, error } = await supabase
      .from('categories')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw notFound('Category');

    await logAction(auth.userId!, 'update', 'category', id, parsed.data);

    res.json({ category: data });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Block deletion if active products reference this category!
 */
router.delete('/admin/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const id = req.params.id as string;

    // Check if any products reference this category
    const { count, error: countErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true);

    if (countErr) throw countErr;

    if (count && count > 0) {
      throw badRequest(
        `Cannot delete category: Reassign or delete the ${count} active product(s) in this category first.`
      );
    }

    // Soft delete category
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw notFound('Category');

    await logAction(auth.userId!, 'delete', 'category', id, { name: data.name });

    res.json({ message: 'Category deleted successfully', category: data });
  } catch (err) {
    next(err);
  }
});

export const categoriesRouter = router;
