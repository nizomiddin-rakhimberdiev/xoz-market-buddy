export type ProductUnit = 'dona' | 'kg' | 'quti' | 'paket';
export type DeliveryType = 'pickup' | 'delivery';
export type PaymentType = 'cash' | 'card' | 'transfer';
export type OrderStatus = 'new' | 'processing' | 'ready' | 'delivered' | 'canceled';

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  unit: ProductUnit;
  cost_price: number;
  price: number;
  old_price: number | null;
  stock_qty: number;
  min_order_qty: number;
  step_qty: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_override: number | null;
  cost_price_override: number | null;
  stock_qty: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_main: boolean;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_address_text: string | null;
  payment_type: PaymentType;
  status: OrderStatus;
  total_amount: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  cost_price_snapshot: number;
  product_name_snapshot: string;
  created_at: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_address_text?: string;
  payment_type: PaymentType;
  comment?: string;
  items: {
    product_id: string;
    variant_id?: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    product_name: string;
  }[];
}
