// ============================================================
// API Configuration
// Resolves the backend API base URL from environment variables.
// In dev: defaults to '/api' (proxied by Vite)
// In prod: uses the full backend Vercel URL (e.g. https://tote-life-api.vercel.app/api)
// ============================================================

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Build a full API URL from a path like '/products' → 'https://backend.vercel.app/api/products'
 */
export function apiUrl(path: string): string {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
