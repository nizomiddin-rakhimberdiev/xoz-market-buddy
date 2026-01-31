import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address_text: string | null;
  payment_type: 'cash' | 'card' | 'transfer';
  total_amount: number;
  comment: string | null;
  items: OrderItem[];
}

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing Telegram credentials');
      return new Response(
        JSON.stringify({ error: 'Telegram credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order } = await req.json() as { order: Order };

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build order items text
    const itemsText = order.items
      .map((item, idx) => `${idx + 1}. ${item.product_name_snapshot} x ${item.quantity} = ${formatPrice(item.line_total)}`)
      .join('\n');

    // Build message
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

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Telegram API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send Telegram message', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Telegram notification sent successfully');
    return new Response(
      JSON.stringify({ success: true, message_id: result.result?.message_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-telegram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
