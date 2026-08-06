// ============================================================
// Storage Service
// Supabase Storage bucket operations for product images
// Uses memory buffers — Vercel has no writable disk
// ============================================================

import { supabase } from '../config/supabase.js';

const BUCKET_NAME = 'product-images';

/**
 * Upload a file buffer to Supabase Storage.
 * Path: products/{productId}/{filename}
 * Returns the public URL.
 */
export async function uploadProductImage(
  productId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ bucketPath: string; publicUrl: string }> {
  const bucketPath = `products/${productId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(bucketPath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(bucketPath);

  return {
    bucketPath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Upload a category image to Supabase Storage.
 * Path: categories/{categoryId}/{filename}
 */
export async function uploadCategoryImage(
  categoryId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ bucketPath: string; publicUrl: string }> {
  const bucketPath = `categories/${categoryId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(bucketPath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Category image upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(bucketPath);

  return {
    bucketPath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Delete a single image from the bucket.
 */
export async function deleteProductImage(bucketPath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([bucketPath]);

  if (error) {
    console.error(`[StorageService] Failed to delete ${bucketPath}:`, error.message);
  }
}

/**
 * Delete all images for a product (when hard-deleting bucket files on delist).
 */
export async function deleteAllProductImages(
  productId: string
): Promise<void> {
  const folderPath = `products/${productId}`;

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath);

  if (listError) {
    console.error(
      `[StorageService] Failed to list files in ${folderPath}:`,
      listError.message
    );
    return;
  }

  if (files && files.length > 0) {
    const paths = files.map((f) => `${folderPath}/${f.name}`);
    const { error: removeError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (removeError) {
      console.error(
        `[StorageService] Failed to delete files:`,
        removeError.message
      );
    }
  }
}
