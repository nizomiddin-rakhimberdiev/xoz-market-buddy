import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, DollarSign, TrendingUp, Eye, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Order, OrderStatus } from '@/types/database';
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

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const { count: newOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');

      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .in('status', ['delivered', 'ready', 'processing']);

      const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;

      return {
        totalOrders: totalOrders || 0,
        newOrders: newOrders || 0,
        totalProducts: totalProducts || 0,
        totalRevenue,
      };
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(7);
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_qty, unit')
        .eq('is_active', true)
        .lte('stock_qty', 5)
        .order('stock_qty', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const statCards = [
    {
      title: 'Yangi buyurtmalar',
      value: stats?.newOrders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Jami buyurtmalar',
      value: stats?.totalOrders || 0,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Mahsulotlar',
      value: stats?.totalProducts || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Daromad',
      value: formatPrice(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'bg-amber-500',
      isPrice: true,
    },
  ];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Hozirgina';
    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} soat oldin`;
    return date.toLocaleDateString('uz-UZ');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          : statCards.map((stat) => (
              <div
                key={stat.title}
                className="bg-card rounded-2xl p-6 flex items-start justify-between"
              >
                <div>
                  <p className="text-muted-foreground text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold mt-2">
                    {stat.isPrice ? stat.value : stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">So'nggi buyurtmalar</h2>
            <Link to="/admin/orders">
              <Button variant="ghost" size="sm">Barchasi</Button>
            </Link>
          </div>
          
          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : recentOrders?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Buyurtmalar yo'q</p>
          ) : (
            <div className="space-y-2">
              {recentOrders?.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{order.order_number}</span>
                        <Badge className={cn('text-[10px] border-0', statusColors[order.status])}>
                          {statusLabels[order.status]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {order.customer_name} • {order.customer_phone}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-semibold text-sm">{formatPrice(order.total_amount)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {formatTime(order.created_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alert */}
        <div className="bg-card rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg mb-4">Kam qolgan mahsulotlar</h2>
          {lowStockProducts?.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">Hammasi yetarli</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts?.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <span className="text-sm truncate mr-2">{p.name}</span>
                  <Badge variant={p.stock_qty <= 0 ? 'destructive' : 'secondary'} className="shrink-0">
                    {p.stock_qty} {p.unit}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
