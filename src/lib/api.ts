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

// Orders - Now uses server-side validated edge function
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: input,
  });

  if (error) {
    console.error('Order creation error:', error);
    throw new Error(error.message || 'Failed to create order');
  }

  if (!data?.success) {
    const errorMessage = data?.error || 'Failed to create order';
    const details = data?.details;
    if (details && Array.isArray(details)) {
      const fieldErrors = details.map((d: { field: string; message: string }) => d.message).join(', ');
      throw new Error(fieldErrors);
    }
    throw new Error(errorMessage);
  }

  return data.order as Order;
}

// Format price
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + ' so\'m';
}
