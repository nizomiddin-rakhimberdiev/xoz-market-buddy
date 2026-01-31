import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface VariantFormItem {
  id?: string; // Only for existing variants
  name: string;
  price_override: string;
  cost_price_override: string;
  stock_qty: string;
  sku: string;
  is_new?: boolean;
}

interface InlineVariantEditorProps {
  variants: VariantFormItem[];
  onChange: (variants: VariantFormItem[]) => void;
  basePrice: string;
  baseCostPrice: string;
}

const emptyVariant: VariantFormItem = {
  name: '',
  price_override: '',
  cost_price_override: '',
  stock_qty: '',
  sku: '',
  is_new: true,
};

export function InlineVariantEditor({ 
  variants, 
  onChange, 
  basePrice, 
  baseCostPrice 
}: InlineVariantEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVariant, setNewVariant] = useState<VariantFormItem>(emptyVariant);

  const handleAddVariant = () => {
    if (!newVariant.name.trim()) return;
    
    onChange([...variants, { ...newVariant, is_new: true }]);
    setNewVariant(emptyVariant);
    setIsAdding(false);
  };

  const handleRemoveVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateVariant = (index: number, field: keyof VariantFormItem, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Variantlar</Label>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Variant
          </Button>
        )}
      </div>

      {/* Existing/added variants list */}
      {variants.length > 0 && (
        <div className="space-y-2">
          {variants.map((variant, index) => (
            <div
              key={variant.id || `new-${index}`}
              className="grid grid-cols-[1fr,80px,80px,60px,auto] gap-2 items-end p-2 bg-secondary/50 rounded-lg"
            >
              <div>
                <Label className="text-xs text-muted-foreground">Nomi</Label>
                <Input
                  value={variant.name}
                  onChange={(e) => handleUpdateVariant(index, 'name', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Variant nomi"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Narx</Label>
                <Input
                  type="number"
                  value={variant.price_override}
                  onChange={(e) => handleUpdateVariant(index, 'price_override', e.target.value)}
                  className="h-8 text-sm"
                  placeholder={basePrice || '0'}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ombor</Label>
                <Input
                  type="number"
                  value={variant.stock_qty}
                  onChange={(e) => handleUpdateVariant(index, 'stock_qty', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <Input
                  value={variant.sku}
                  onChange={(e) => handleUpdateVariant(index, 'sku', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="-"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                onClick={() => handleRemoveVariant(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new variant form */}
      {isAdding && (
        <div className="p-3 border border-primary/30 rounded-lg bg-primary/5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Variant nomi *</Label>
              <Input
                value={newVariant.name}
                onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                placeholder="Masalan: Kichik, O'rta, Katta"
                className="h-9"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Narx (boshqacha bo'lsa)</Label>
              <Input
                type="number"
                value={newVariant.price_override}
                onChange={(e) => setNewVariant({ ...newVariant, price_override: e.target.value })}
                placeholder={basePrice || 'Asosiy narx'}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Omborda</Label>
              <Input
                type="number"
                value={newVariant.stock_qty}
                onChange={(e) => setNewVariant({ ...newVariant, stock_qty: e.target.value })}
                placeholder="0"
                className="h-9"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewVariant(emptyVariant);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Bekor
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddVariant}
              disabled={!newVariant.name.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Qo'shish
            </Button>
          </div>
        </div>
      )}

      {variants.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Variantsiz mahsulot. Variant qo'shish uchun yuqoridagi tugmani bosing.
        </p>
      )}
    </div>
  );
}
