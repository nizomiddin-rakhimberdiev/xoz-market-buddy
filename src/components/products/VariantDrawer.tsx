import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/api';
import type { Product, ProductVariant } from '@/types/database';

interface VariantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onAddToCart: (variant: ProductVariant) => void;
}

export function VariantDrawer({
  open,
  onOpenChange,
  product,
  onAddToCart,
}: VariantDrawerProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const mainImage = product.images?.find((img) => img.is_main) || product.images?.[0];

  const activeVariants = product.variants?.filter((v) => v.is_active && v.stock_qty > 0) || [];

  const handleAddToCart = () => {
    if (selectedVariant) {
      onAddToCart(selectedVariant);
      setSelectedVariant(null);
      onOpenChange(false);
    }
  };

  const getVariantPrice = (variant: ProductVariant) => {
    return variant.price_override ?? product.price;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-base">Variantni tanlang</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          {/* Product info */}
          <div className="flex gap-3">
            {mainImage ? (
              <img
                src={mainImage.image_url}
                alt={product.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-secondary" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
              <p className="text-primary font-semibold mt-1">
                {formatPrice(selectedVariant ? getVariantPrice(selectedVariant) : product.price)}
              </p>
            </div>
          </div>

          {/* Variants grid */}
          <div className="grid grid-cols-2 gap-2">
            {activeVariants.map((variant) => {
              const price = getVariantPrice(variant);
              const isSelected = selectedVariant?.id === variant.id;
              
              return (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={cn(
                    'relative p-3 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <span className="font-medium text-sm block">{variant.name}</span>
                  <span className="text-xs text-muted-foreground block mt-1">
                    {formatPrice(price)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {variant.stock_qty} dona mavjud
                  </span>
                </button>
              );
            })}
          </div>

          {activeVariants.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Hozircha variantlar mavjud emas
            </p>
          )}
        </div>

        <DrawerFooter className="pt-2">
          <Button
            onClick={handleAddToCart}
            disabled={!selectedVariant}
            className="w-full gap-2"
            size="lg"
          >
            <ShoppingCart className="w-5 h-5" />
            Savatga qo'shish
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Bekor qilish
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
