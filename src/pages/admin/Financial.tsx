import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminFinancial() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-financial'],
    queryFn: async () => {
      // Get all delivered orders with their items
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, status')
        .in('status', ['delivered', 'ready', 'processing']);

      if (ordersError) throw ordersError;

      // Get order items with cost snapshots
      const orderIds = orders?.map((o) => o.id) || [];
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, quantity, unit_price, cost_price_snapshot')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Calculate totals
      let totalRevenue = 0;
      let totalCost = 0;

      items?.forEach((item) => {
        totalRevenue += item.unit_price * item.quantity;
        totalCost += item.cost_price_snapshot * item.quantity;
      });

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Get daily stats for last 7 days
      const { data: dailyOrders } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in('status', ['delivered', 'ready', 'processing']);

      const dailyStats = dailyOrders?.reduce((acc, order) => {
        const date = new Date(order.created_at).toLocaleDateString('uz-UZ');
        acc[date] = (acc[date] || 0) + order.total_amount;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        dailyStats,
        ordersCount: orders?.length || 0,
      };
    },
  });

  const statCards = [
    {
      title: 'Umumiy daromad',
      value: stats?.totalRevenue || 0,
      icon: DollarSign,
      color: 'bg-blue-500',
    },
    {
      title: 'Umumiy tannarx',
      value: stats?.totalCost || 0,
      icon: TrendingDown,
      color: 'bg-red-500',
    },
    {
      title: 'Sof foyda',
      value: stats?.totalProfit || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Foyda foizi',
      value: `${(stats?.profitMargin || 0).toFixed(1)}%`,
      icon: Wallet,
      color: 'bg-purple-500',
      isPercent: true,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Moliya</h1>

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
                    {stat.isPercent ? stat.value : formatPrice(stat.value as number)}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            ))}
      </div>

      {/* Daily revenue */}
      <div className="bg-card rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-4">Kunlik daromad (so'nggi 7 kun)</h2>
        
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="space-y-4">
            {Object.entries(stats?.dailyStats || {})
              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([date, amount]) => (
                <div key={date} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{date}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-4 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min((amount / (stats?.totalRevenue || 1)) * 100 * 7, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="font-semibold">{formatPrice(amount)}</span>
                </div>
              ))}
            {Object.keys(stats?.dailyStats || {}).length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                So'nggi 7 kunda buyurtmalar yo'q
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-card rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-4">Xulosa</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-muted-foreground text-sm">Tugallangan buyurtmalar</p>
            <p className="text-2xl font-bold">{stats?.ordersCount || 0}</p>
          </div>
          <div className="p-4 bg-success/10 rounded-xl">
            <p className="text-muted-foreground text-sm">O'rtacha chek</p>
            <p className="text-2xl font-bold text-success">
              {formatPrice(
                stats?.ordersCount ? Math.round(stats.totalRevenue / stats.ordersCount) : 0
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
