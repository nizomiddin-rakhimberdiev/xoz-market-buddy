import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Package, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get order counts
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

      // Get revenue
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

      {/* Quick info */}
      <div className="bg-card rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-4">Tezkor ma'lumot</h2>
        <p className="text-muted-foreground">
          Admin panelga xush kelibsiz! Chap menyudan buyurtmalar, mahsulotlar va moliya bo'limlariga o'tishingiz mumkin.
        </p>
      </div>
    </div>
  );
}
