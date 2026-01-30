import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Phone, User, CreditCard, Truck, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order, OrderItem, OrderStatus } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  canceled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<OrderStatus, string> = {
  new: 'Yangi',
  processing: 'Tayyorlanmoqda',
  ready: 'Tayyor',
  delivered: 'Yetkazildi',
  canceled: 'Bekor qilindi',
};

const paymentLabels = {
  cash: 'Naqd pul',
  card: 'Plastik karta',
  transfer: 'Bank o\'tkazmasi',
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async () => {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      return { ...orderData, items } as Order & { items: OrderItem[] };
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status yangilandi');
    },
    onError: () => {
      toast.error('Xatolik yuz berdi');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Buyurtma topilmadi</p>
        <Link to="/admin/orders">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </Link>
      </div>
    );
  }

  const statusActions: { status: OrderStatus; label: string; color: string }[] = [
    { status: 'processing', label: 'Tayyorlanmoqda', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { status: 'ready', label: 'Tayyor', color: 'bg-green-500 hover:bg-green-600' },
    { status: 'delivered', label: 'Yetkazildi', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { status: 'canceled', label: 'Bekor qilish', color: 'bg-red-500 hover:bg-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">{order.order_number}</h1>
            <p className="text-muted-foreground text-sm">
              {new Date(order.created_at).toLocaleString('uz-UZ')}
            </p>
          </div>
        </div>
        <span className={cn('px-4 py-2 rounded-full font-medium', statusColors[order.status])}>
          {statusLabels[order.status]}
        </span>
      </div>

      {/* Status actions */}
      <div className="flex flex-wrap gap-2">
        {statusActions
          .filter((s) => s.status !== order.status)
          .map((action) => (
            <Button
              key={action.status}
              onClick={() => updateStatusMutation.mutate(action.status)}
              className={cn('text-white', action.color)}
              disabled={updateStatusMutation.isPending}
            >
              {action.label}
            </Button>
          ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customer info */}
        <div className="bg-card rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-bold text-lg">Mijoz ma'lumotlari</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <span>{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline">
                {order.customer_phone}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <span>{paymentLabels[order.payment_type]}</span>
            </div>
            <div className="flex items-center gap-3">
              {order.delivery_type === 'delivery' ? (
                <Truck className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Store className="w-5 h-5 text-muted-foreground" />
              )}
              <span>{order.delivery_type === 'delivery' ? 'Yetkazib berish' : 'Olib ketish'}</span>
            </div>
          </div>

          {order.delivery_type === 'delivery' && order.delivery_address_text && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <span>{order.delivery_address_text}</span>
              </div>
              
              {order.delivery_lat && order.delivery_lng && (
                <div className="mt-4 rounded-xl overflow-hidden">
                  <iframe
                    src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${order.delivery_lng}!3d${order.delivery_lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTrCsDE4JzAwLjAiTiAzOcKwMzYnMDAuMCJF!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s`}
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}

          {order.comment && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Izoh:</p>
              <p>{order.comment}</p>
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="bg-card rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-bold text-lg">Buyurtma tarkibi</h2>
          
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{item.product_name_snapshot}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} × {formatPrice(item.unit_price)}
                  </p>
                </div>
                <p className="font-semibold">{formatPrice(item.line_total)}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Jami:</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
