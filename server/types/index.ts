// ============================================================
// The Tote Life — Shared TypeScript Types
// ============================================================

// ---- Enums matching Postgres ----

export type ParentGroup = 'bags' | 'furniture';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type MessageSender = 'customer' | 'admin';

export type AdminRole = 'admin' | 'super_admin';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'login'
  | 'telegram_action';

// ---- Database Row Types ----

export interface Category {
  id: string;
  name: string;
  parent_group: ParentGroup;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  size: string | null;
  colors: string[] | null;
  materials: string[] | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  bucket_path: string;
  public_url: string;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_method: string;
  delivery_fee: number;
  shipping_address: Record<string, string> | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  payment_reference: string | null;
  paystack_reference?: string | null;
  placed_at: string;
  status_updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_at_purchase: number;
  selected_size: string | null;
  selected_color: string | null;
  created_at: string;
}

export interface Admin {
  id: string;
  clerk_user_id: string;
  role: AdminRole;
  telegram_chat_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportConversation {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  telegram_thread_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ---- API Request/Response Types ----

export interface ProductWithImages extends Product {
  images: ProductImage[];
  category?: Category;
}

export interface CheckoutItem {
  product_id: string;
  quantity: number;
  selected_size?: string;
  selected_color?: string;
}

export interface CheckoutRequest {
  items: CheckoutItem[];
  delivery_method: 'door' | 'pickup';
  shipping_address?: {
    address: string;
    city: string;
    state: string;
  };
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  callback_url: string;
}

export interface SalesDataPoint {
  period: string;
  total: number;
}

export interface CategorySalesData {
  category: string;
  total: number;
  parent_group: ParentGroup;
}

// ---- Utility Types ----

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
