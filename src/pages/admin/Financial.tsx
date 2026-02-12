import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  CalendarDays,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
  { value: '90d', label: '90 kun' },
  { value: 'all', label: 'Barchasi' },
];

const CHART_COLORS = [
  'hsl(239, 84%, 67%)',
  'hsl(25, 95%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(264, 84%, 67%)',
  'hsl(0, 84%, 60%)',
  'hsl(200, 80%, 50%)',
  'hsl(320, 70%, 55%)',
];

function getDateFrom(range: DateRange): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default function AdminFinancial() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-financial', dateRange],
    queryFn: async () => {
      const dateFrom = getDateFrom(dateRange);

      // Build orders query
      let ordersQuery = supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .in('status', ['delivered', 'ready', 'processing']);

      if (dateFrom) {
        ordersQuery = ordersQuery.gte('created_at', dateFrom);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      const orderIds = orders?.map((o) => o.id) || [];
      
      if (orderIds.length === 0) {
        return {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMargin: 0,
          dailyStats: [] as { date: string; revenue: number; cost: number; profit: number }[],
          ordersCount: 0,
          avgCheck: 0,
          productStats: [] as { name: string; revenue: number; cost: number; profit: number; quantity: number }[],
          statusBreakdown: [] as { name: string; value: number }[],
        };
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, quantity, unit_price, cost_price_snapshot, product_name_snapshot')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Build a map of order_id -> created_at
      const orderDateMap: Record<string, string> = {};
      orders?.forEach((o) => {
        orderDateMap[o.id] = o.created_at!;
      });

      // Totals
      let totalRevenue = 0;
      let totalCost = 0;

      // Daily aggregation
      const dailyMap: Record<string, { revenue: number; cost: number }> = {};
      // Product aggregation
      const productMap: Record<string, { revenue: number; cost: number; quantity: number }> = {};

      items?.forEach((item) => {
        const rev = item.unit_price * item.quantity;
        const cost = item.cost_price_snapshot * item.quantity;
        totalRevenue += rev;
        totalCost += cost;

        // Daily
        const orderDate = orderDateMap[item.order_id];
        if (orderDate) {
          const dateKey = new Date(orderDate).toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
          });
          if (!dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, cost: 0 };
          dailyMap[dateKey].revenue += rev;
          dailyMap[dateKey].cost += cost;
        }

        // Product
        const pName = item.product_name_snapshot;
        if (!productMap[pName]) productMap[pName] = { revenue: 0, cost: 0, quantity: 0 };
        productMap[pName].revenue += rev;
        productMap[pName].cost += cost;
        productMap[pName].quantity += item.quantity;
      });

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Convert daily map to sorted array
      const dailyStats = Object.entries(dailyMap)
        .map(([date, vals]) => ({
          date,
          revenue: vals.revenue,
          cost: vals.cost,
          profit: vals.revenue - vals.cost,
        }))
        .sort((a, b) => {
          // sort by date string
          const [dA, mA] = a.date.split('.').map(Number);
          const [dB, mB] = b.date.split('.').map(Number);
          return mA !== mB ? mA - mB : dA - dB;
        });

      // Product stats sorted by revenue
      const productStats = Object.entries(productMap)
        .map(([name, vals]) => ({
          name,
          revenue: vals.revenue,
          cost: vals.cost,
          profit: vals.revenue - vals.cost,
          quantity: vals.quantity,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Status breakdown
      const statusMap: Record<string, number> = {};
      orders?.forEach((o) => {
        const s = o.status || 'new';
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const statusLabels: Record<string, string> = {
        new: 'Yangi',
        processing: 'Tayyorlanmoqda',
        ready: 'Tayyor',
        delivered: 'Yetkazildi',
        canceled: 'Bekor qilindi',
      };
      const statusBreakdown = Object.entries(statusMap).map(([key, value]) => ({
        name: statusLabels[key] || key,
        value,
      }));

      return {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        dailyStats,
        ordersCount: orders?.length || 0,
        avgCheck: orders?.length ? Math.round(totalRevenue / orders.length) : 0,
        productStats,
        statusBreakdown,
      };
    },
  });

  // Previous period comparison (simple: compare first half vs second half of daily data)
  const trend = useMemo(() => {
    if (!stats?.dailyStats || stats.dailyStats.length < 2) return null;
    const mid = Math.floor(stats.dailyStats.length / 2);
    const firstHalf = stats.dailyStats.slice(0, mid);
    const secondHalf = stats.dailyStats.slice(mid);
    const firstRev = firstHalf.reduce((s, d) => s + d.revenue, 0);
    const secondRev = secondHalf.reduce((s, d) => s + d.revenue, 0);
    if (firstRev === 0) return null;
    const change = ((secondRev - firstRev) / firstRev) * 100;
    return { change: Math.round(change), isUp: change >= 0 };
  }, [stats?.dailyStats]);

  const statCards = [
    {
      title: 'Umumiy daromad',
      value: stats?.totalRevenue || 0,
      icon: DollarSign,
      gradient: 'from-primary to-[hsl(264,84%,67%)]',
    },
    {
      title: 'Umumiy tannarx',
      value: stats?.totalCost || 0,
      icon: TrendingDown,
      gradient: 'from-destructive to-[hsl(25,95%,53%)]',
    },
    {
      title: 'Sof foyda',
      value: stats?.totalProfit || 0,
      icon: TrendingUp,
      gradient: 'from-success to-[hsl(160,70%,45%)]',
    },
    {
      title: "O'rtacha chek",
      value: stats?.avgCheck || 0,
      icon: Wallet,
      gradient: 'from-[hsl(264,84%,67%)] to-primary',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatPrice(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Moliya</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Daromad, xarajat va foyda tahlili
          </p>
        </div>

        <Tabs
          value={dateRange}
          onValueChange={(v) => setDateRange(v as DateRange)}
          className="w-fit"
        >
          <TabsList className="bg-secondary">
            {DATE_RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value} className="text-xs sm:text-sm">
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : statCards.map((stat) => (
              <div
                key={stat.title}
                className="bg-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-bl-[40px] transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${stat.gradient} mb-3`}>
                  <stat.icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">{stat.title}</p>
                <p className="text-lg sm:text-xl font-bold mt-1 truncate">
                  {formatPrice(stat.value as number)}
                </p>
              </div>
            ))}
      </div>

      {/* Trend + Margin summary */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Foyda foizi</p>
              <p className="text-lg font-bold">{stats.profitMargin.toFixed(1)}%</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Buyurtmalar</p>
              <p className="text-lg font-bold">{stats.ordersCount}</p>
            </div>
          </div>
          {trend && (
            <div className="bg-card rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className={`p-2 rounded-xl ${trend.isUp ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {trend.isUp ? (
                  <ArrowUpRight className="w-5 h-5 text-success" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trend</p>
                <p className={`text-lg font-bold ${trend.isUp ? 'text-success' : 'text-destructive'}`}>
                  {trend.isUp ? '+' : ''}
                  {trend.change}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-card rounded-2xl p-4 sm:p-6">
        <h2 className="font-display font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Kunlik daromad va foyda
        </h2>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : stats?.dailyStats && stats.dailyStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.dailyStats}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 90%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(240, 4%, 46%)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(240, 4%, 46%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Daromad"
                stroke="hsl(239, 84%, 67%)"
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Foyda"
                stroke="hsl(142, 71%, 45%)"
                fill="url(#colorProfit)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            Bu davr uchun ma'lumot yo'q
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Product Profitability Table */}
        <div className="lg:col-span-3 bg-card rounded-2xl p-4 sm:p-6">
          <h2 className="font-display font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Mahsulot bo'yicha foyda
          </h2>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : stats?.productStats && stats.productStats.length > 0 ? (
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Mahsulot</TableHead>
                    <TableHead className="text-xs text-right">Soni</TableHead>
                    <TableHead className="text-xs text-right">Daromad</TableHead>
                    <TableHead className="text-xs text-right">Foyda</TableHead>
                    <TableHead className="text-xs text-right">Marja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.productStats.slice(0, 15).map((p) => {
                    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0';
                    return (
                      <TableRow key={p.name}>
                        <TableCell className="font-medium text-sm max-w-[140px] truncate">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-right text-sm">{p.quantity}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatPrice(p.revenue)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-semibold ${
                            p.profit >= 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {formatPrice(p.profit)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{margin}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">Ma'lumot yo'q</p>
          )}
        </div>

        {/* Status Pie Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-4 sm:p-6">
          <h2 className="font-display font-bold text-base sm:text-lg mb-4">
            Buyurtma holatlari
          </h2>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : stats?.statusBreakdown && stats.statusBreakdown.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.statusBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} ta`, '']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(240, 6%, 90%)',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {stats.statusBreakdown.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">
                      {s.name} ({s.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">Ma'lumot yo'q</p>
          )}
        </div>
      </div>

      {/* Top Products Bar Chart */}
      {!isLoading && stats?.productStats && stats.productStats.length > 0 && (
        <div className="bg-card rounded-2xl p-4 sm:p-6">
          <h2 className="font-display font-bold text-base sm:text-lg mb-4">
            Top mahsulotlar (daromad bo'yicha)
          </h2>
          <ResponsiveContainer width="100%" height={Math.min(stats.productStats.length * 44 + 40, 400)}>
            <BarChart
              data={stats.productStats.slice(0, 8)}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 90%)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: 'hsl(240, 4%, 46%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 11, fill: 'hsl(240, 4%, 46%)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="revenue"
                name="Daromad"
                fill="hsl(239, 84%, 67%)"
                radius={[0, 6, 6, 0]}
                barSize={20}
              />
              <Bar
                dataKey="profit"
                name="Foyda"
                fill="hsl(142, 71%, 45%)"
                radius={[0, 6, 6, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
