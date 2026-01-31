import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/api';
import type { ProductVariant } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VariantManagerProps {
  productId: string;
  variants: ProductVariant[];
  basePrice: number;
  baseCostPrice: number;
  onVariantsChange: () => void;
}

interface VariantFormData {
  name: string;
  price_override: string;
  cost_price_override: string;
  stock_qty: string;
  sku: string;
}

const emptyForm: VariantFormData = {
  name: '',
  price_override: '',
  cost_price_override: '',
  stock_qty: '',
  sku: '',
};

export function VariantManager({ 
  productId, 
  variants, 
  basePrice, 
  baseCostPrice,
  onVariantsChange 
}: VariantManagerProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VariantFormData>(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: VariantFormData) => {
      const { error } = await supabase.from('product_variants').insert({
        product_id: productId,
        name: data.name,
        price_override: data.price_override ? Number(data.price_override) : null,
        cost_price_override: data.cost_price_override ? Number(data.cost_price_override) : null,
        stock_qty: data.stock_qty ? Number(data.stock_qty) : 0,
        sku: data.sku || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Variant qo\'shildi');
      setIsAdding(false);
      setFormData(emptyForm);
      onVariantsChange();
    },
    onError: (error: any) => {
      toast.error('Xatolik', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VariantFormData }) => {
      const { error } = await supabase
        .from('product_variants')
        .update({
          name: data.name,
          price_override: data.price_override ? Number(data.price_override) : null,
          cost_price_override: data.cost_price_override ? Number(data.cost_price_override) : null,
          stock_qty: data.stock_qty ? Number(data.stock_qty) : 0,
          sku: data.sku || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Variant yangilandi');
      setEditingId(null);
      setFormData(emptyForm);
      onVariantsChange();
    },
    onError: (error: any) => {
      toast.error('Xatolik', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Variant o\'chirildi');
      onVariantsChange();
    },
    onError: (error: any) => {
      toast.error('Xatolik', { description: error.message });
    },
  });

  const handleStartEdit = (variant: ProductVariant) => {
    setEditingId(variant.id);
    setFormData({
      name: variant.name,
      price_override: variant.price_override?.toString() || '',
      cost_price_override: variant.cost_price_override?.toString() || '',
      stock_qty: variant.stock_qty?.toString() || '',
      sku: variant.sku || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Variant nomini kiriting');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Variantlar</Label>
        {!isAdding && !editingId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Qo'shish
          </Button>
        )}
      </div>

      {/* Add/Edit form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-xl space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Variant nomi *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masalan: Kichik, O'rta, Katta"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Narx ({formatPrice(basePrice)} bo'lmasa)</Label>
              <Input
                type="number"
                value={formData.price_override}
                onChange={(e) => setFormData({ ...formData, price_override: e.target.value })}
                placeholder={basePrice.toString()}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Tannarx</Label>
              <Input
                type="number"
                value={formData.cost_price_override}
                onChange={(e) => setFormData({ ...formData, cost_price_override: e.target.value })}
                placeholder={baseCostPrice.toString()}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Omborda</Label>
              <Input
                type="number"
                value={formData.stock_qty}
                onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Artikul"
                className="h-9"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-1" />
              Bekor
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Saqlash
            </Button>
          </div>
        </form>
      )}

      {/* Variants list */}
      {variants.length === 0 && !isAdding ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Variantlar yo'q
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl border',
                variant.is_active ? 'bg-card' : 'bg-secondary/30 opacity-60',
                editingId === variant.id && 'hidden'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{variant.name}</span>
                  {variant.sku && (
                    <span className="text-xs text-muted-foreground">({variant.sku})</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">
                    {formatPrice(variant.price_override ?? basePrice)}
                  </span>
                  <span>Ombor: {variant.stock_qty ?? 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleStartEdit(variant)}
                  disabled={!!editingId}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm('Variantni o\'chirishni xohlaysizmi?')) {
                      deleteMutation.mutate(variant.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
