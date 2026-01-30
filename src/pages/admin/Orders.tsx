import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Order, OrderStatus } from '@/types/database';
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

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status yangilandi');
    },
    onError: () => {
      toast.error('Xatolik yuz berdi');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Buyurtmalar</h1>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hammasi</SelectItem>
              <SelectItem value="new">Yangi</SelectItem>
              <SelectItem value="processing">Tayyorlanmoqda</SelectItem>
              <SelectItem value="ready">Tayyor</SelectItem>
              <SelectItem value="delivered">Yetkazildi</SelectItem>
              <SelectItem value="canceled">Bekor</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Buyurtma</th>
                <th className="text-left px-4 py-3 font-medium">Mijoz</th>
                <th className="text-left px-4 py-3 font-medium">Summa</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Sana</th>
                <th className="text-right px-4 py-3 font-medium">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : orders?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Buyurtmalar topilmadi
                  </td>
                </tr>
              ) : (
                orders?.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={order.status}
                        onValueChange={(status) =>
                          updateStatusMutation.mutate({ orderId: order.id, status: status as OrderStatus })
                        }
                      >
                        <SelectTrigger className={cn('w-36 border-0', statusColors[order.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {new Date(order.created_at).toLocaleString('uz-UZ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
