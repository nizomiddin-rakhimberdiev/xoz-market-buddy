import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 orders per minute per IP

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(clientIp, { count: 1, timestamp: now });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  entry.count++;
  return false;
}

// Input validation schemas
interface OrderItemInput {
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  product_name: string;
}

interface OrderInput {
  customer_name: string;
  customer_phone: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_address_text?: string;
  payment_type: 'cash' | 'card' | 'transfer';
  comment?: string;
  items: OrderItemInput[];
}

interface ValidationError {
  field: string;
  message: string;
}

function validateUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function sanitizeString(value: string, maxLength: number): string {
  return value
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Basic XSS prevention
}

function validateOrderInput(input: unknown): { valid: boolean; errors: ValidationError[]; data?: OrderInput } {
  const errors: ValidationError[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'root', message: 'Invalid request body' }] };
  }
  
  const data = input as Record<string, unknown>;
  
  // Validate customer_name
  if (typeof data.customer_name !== 'string' || data.customer_name.trim().length < 2) {
    errors.push({ field: 'customer_name', message: 'Customer name is required (min 2 characters)' });
  } else if (data.customer_name.length > 100) {
    errors.push({ field: 'customer_name', message: 'Customer name is too long (max 100 characters)' });
  }
  
  // Validate customer_phone (Uzbekistan format)
  const phoneRegex = /^\+?998\d{9}$/;
  if (typeof data.customer_phone !== 'string') {
    errors.push({ field: 'customer_phone', message: 'Customer phone is required' });
  } else {
    const cleanPhone = data.customer_phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.push({ field: 'customer_phone', message: 'Invalid phone number format (must be +998XXXXXXXXX)' });
    }
  }
  
  // Validate delivery_type
  const validDeliveryTypes = ['pickup', 'delivery'];
  if (!validDeliveryTypes.includes(data.delivery_type as string)) {
    errors.push({ field: 'delivery_type', message: 'Invalid delivery type (must be pickup or delivery)' });
  }
  
  // Validate delivery address for delivery orders
  if (data.delivery_type === 'delivery') {
    if (typeof data.delivery_address_text !== 'string' || data.delivery_address_text.trim().length < 5) {
      errors.push({ field: 'delivery_address_text', message: 'Delivery address is required for delivery orders' });
    } else if (data.delivery_address_text.length > 500) {
      errors.push({ field: 'delivery_address_text', message: 'Delivery address is too long (max 500 characters)' });
    }
    
    // Validate coordinates
    if (typeof data.delivery_lat === 'number' && (data.delivery_lat < -90 || data.delivery_lat > 90)) {
      errors.push({ field: 'delivery_lat', message: 'Invalid latitude' });
    }
    if (typeof data.delivery_lng === 'number' && (data.delivery_lng < -180 || data.delivery_lng > 180)) {
      errors.push({ field: 'delivery_lng', message: 'Invalid longitude' });
    }
  }
  
  // Validate payment_type
  const validPaymentTypes = ['cash', 'card', 'transfer'];
  if (!validPaymentTypes.includes(data.payment_type as string)) {
    errors.push({ field: 'payment_type', message: 'Invalid payment type (must be cash, card, or transfer)' });
  }
  
  // Validate comment
  if (data.comment !== undefined && data.comment !== null) {
    if (typeof data.comment !== 'string') {
      errors.push({ field: 'comment', message: 'Comment must be a string' });
    } else if (data.comment.length > 1000) {
      errors.push({ field: 'comment', message: 'Comment is too long (max 1000 characters)' });
    }
  }
  
  // Validate items
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one item is required' });
  } else if (data.items.length > 50) {
    errors.push({ field: 'items', message: 'Too many items (max 50)' });
  } else {
    data.items.forEach((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        errors.push({ field: `items[${index}]`, message: 'Invalid item' });
        return;
      }
      
      const orderItem = item as Record<string, unknown>;
      
      // Validate product_id
      if (typeof orderItem.product_id !== 'string' || !validateUUID(orderItem.product_id)) {
        errors.push({ field: `items[${index}].product_id`, message: 'Invalid product ID' });
      }
      
      // Validate variant_id (optional)
      if (orderItem.variant_id !== undefined && orderItem.variant_id !== null) {
        if (typeof orderItem.variant_id !== 'string' || !validateUUID(orderItem.variant_id)) {
          errors.push({ field: `items[${index}].variant_id`, message: 'Invalid variant ID' });
        }
      }
      
      // Validate quantity
      if (typeof orderItem.quantity !== 'number' || orderItem.quantity < 1 || orderItem.quantity > 1000) {
        errors.push({ field: `items[${index}].quantity`, message: 'Invalid quantity (must be 1-1000)' });
      }
      
      // Validate unit_price
      if (typeof orderItem.unit_price !== 'number' || orderItem.unit_price < 0 || orderItem.unit_price > 100000000) {
        errors.push({ field: `items[${index}].unit_price`, message: 'Invalid unit price' });
      }
      
      // Validate cost_price
      if (typeof orderItem.cost_price !== 'number' || orderItem.cost_price < 0 || orderItem.cost_price > 100000000) {
        errors.push({ field: `items[${index}].cost_price`, message: 'Invalid cost price' });
      }
      
      // Validate product_name
      if (typeof orderItem.product_name !== 'string' || orderItem.product_name.trim().length < 1) {
        errors.push({ field: `items[${index}].product_name`, message: 'Product name is required' });
      } else if (orderItem.product_name.length > 255) {
        errors.push({ field: `items[${index}].product_name`, message: 'Product name is too long (max 255 characters)' });
      }
    });
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Return sanitized data
  const sanitizedData: OrderInput = {
    customer_name: sanitizeString(data.customer_name as string, 100),
    customer_phone: (data.customer_phone as string).replace(/\s/g, ''),
    delivery_type: data.delivery_type as 'pickup' | 'delivery',
    payment_type: data.payment_type as 'cash' | 'card' | 'transfer',
    items: (data.items as OrderItemInput[]).map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: Math.floor(item.quantity),
      unit_price: Math.floor(item.unit_price),
      cost_price: Math.floor(item.cost_price),
      product_name: sanitizeString(item.product_name, 255),
    })),
  };
  
  if (data.delivery_type === 'delivery') {
    sanitizedData.delivery_lat = data.delivery_lat as number;
    sanitizedData.delivery_lng = data.delivery_lng as number;
    sanitizedData.delivery_address_text = sanitizeString(data.delivery_address_text as string, 500);
  }
  
  if (data.comment) {
    sanitizedData.comment = sanitizeString(data.comment as string, 1000);
  }
  
  return { valid: true, errors: [], data: sanitizedData };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    if (isRateLimited(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse and validate input
    const body = await req.json();
    const validation = validateOrderInput(body);
    
    if (!validation.valid || !validation.data) {
      console.warn('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const input = validation.data;
    
    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify products exist and are active
    const productIds = input.items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price, cost_price, is_active, name')
      .in('id', productIds);
    
    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const productMap = new Map(products?.map(p => [p.id, p]) || []);
    
    // Validate all products exist and are active
    for (const item of input.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.product_id}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!product.is_active) {
        return new Response(
          JSON.stringify({ error: `Product is not available: ${product.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Verify variants if specified
    const variantIds = input.items.filter(item => item.variant_id).map(item => item.variant_id);
    if (variantIds.length > 0) {
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('id, product_id, is_active, price_override, cost_price_override')
        .in('id', variantIds);
      
      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
        return new Response(
          JSON.stringify({ error: 'Failed to validate variants' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const variantMap = new Map(variants?.map(v => [v.id, v]) || []);
      
      for (const item of input.items) {
        if (item.variant_id) {
          const variant = variantMap.get(item.variant_id);
          if (!variant) {
            return new Response(
              JSON.stringify({ error: `Variant not found: ${item.variant_id}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (!variant.is_active) {
            return new Response(
              JSON.stringify({ error: 'Product variant is not available' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (variant.product_id !== item.product_id) {
            return new Response(
              JSON.stringify({ error: 'Variant does not belong to product' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }
    
    // Generate order number
    const orderNumber = `XOZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Calculate total from validated prices
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
    
    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    
    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Try to delete the order if items failed
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create order items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Send Telegram notification (non-blocking)
    try {
      const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
      const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
      
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const formatPrice = (price: number): string => {
          return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
        };
        
        const getPaymentTypeLabel = (type: string): string => {
          const labels: Record<string, string> = {
            cash: "💵 Naqd",
            card: "💳 Karta",
            transfer: "🏦 O'tkazma",
          };
          return labels[type] || type;
        };
        
        const getDeliveryTypeLabel = (type: string): string => {
          return type === 'delivery' ? "🚗 Yetkazib berish" : "🏪 Olib ketish";
        };
        
        const itemsText = orderItems
          .map((item, idx) => `${idx + 1}. ${item.product_name_snapshot} x ${item.quantity} = ${formatPrice(item.line_total)}`)
          .join('\n');
        
        const message = `
🛒 *YANGI BUYURTMA!*

📦 *Buyurtma:* \`${order.order_number}\`

👤 *Mijoz:* ${order.customer_name}
📞 *Telefon:* ${order.customer_phone}

${getDeliveryTypeLabel(order.delivery_type)}
${order.delivery_address_text ? `📍 *Manzil:* ${order.delivery_address_text}` : ''}

${getPaymentTypeLabel(order.payment_type)}

*Mahsulotlar:*
${itemsText}

💰 *Jami:* ${formatPrice(order.total_amount)}

${order.comment ? `💬 *Izoh:* ${order.comment}` : ''}
`.trim();
        
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
          }),
        }).catch(e => console.error('Telegram notification failed:', e));
      }
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
    
    console.log(`Order created successfully: ${order.order_number}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        order: {
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          status: order.status,
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in create-order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
