// ============================================================
// Audit Service
// Logs admin actions to the audit_log table
// Called from all admin CRUD and Telegram-bot-triggered mutations
// ============================================================

import { supabase } from '../config/supabase.js';
import type { AuditAction } from '../types/index.js';

/**
 * Record an admin action in the audit log.
 */
export async function logAction(
  adminId: string,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_log').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
    });

    if (error) {
      // Log failure but don't throw — audit logging should never block operations
      console.error('[AuditService] Failed to log action:', error.message);
    }
  } catch (err) {
    console.error('[AuditService] Unexpected error:', err);
  }
}
