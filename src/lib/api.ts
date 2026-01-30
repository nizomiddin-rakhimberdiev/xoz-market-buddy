import { supabase } from '@/integrations/supabase/client';
import type { Category, Product, Order, CreateOrderInput } from '@/types/database';

// Categories
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Products
export async function getProducts(params?: {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ products: Product[]; total: number }> {
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `, { count: 'exact' })
    .eq('is_active', true);

  if (params?.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
  }

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) throw error;
  return { products: (data as Product[]) || [], total: count || 0 };
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Product;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Product;
}

// Orders
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // Generate order number
  const orderNumber = `XOZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      delivery_type: input.delivery_type,
      delivery_lat: input.delivery_lat,
      delivery_lng: input.delivery_lng,
      delivery_address_text: input.delivery_address_text,
      payment_type: input.payment_type,
      comment: input.comment,
      total_amount: totalAmount,
      status: 'new',
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    variant_id: item.variant_id || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.unit_price * item.quantity,
    cost_price_snapshot: item.cost_price,
    product_name_snapshot: item.product_name,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // Trigger Telegram notification via edge function
  try {
    await supabase.functions.invoke('notify-telegram', {
      body: { order: { ...order, items: orderItems } },
    });
  } catch (e) {
    console.error('Failed to send Telegram notification:', e);
  }

  return order as Order;
}

// Format price
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + ' so\'m';
}
