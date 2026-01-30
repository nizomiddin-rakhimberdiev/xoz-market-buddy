import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Truck, CreditCard, Package } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGallery } from '@/components/products/ProductGallery';
import { VariantSelector } from '@/components/products/VariantSelector';
import { QuantitySelector } from '@/components/products/QuantitySelector';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCartStore } from '@/stores/cartStore';
import { getProductBySlug, formatPrice } from '@/lib/api';
import type { ProductVariant } from '@/types/database';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, getItemQuantity } = useCartStore();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug!),
    enabled: !!slug,
  });

  // Reset selection when product changes
  useEffect(() => {
    setSelectedVariant(null);
    setQuantity(product?.min_order_qty || 1);
  }, [product?.id]);

  const currentPrice = selectedVariant?.price_override ?? product?.price ?? 0;
  const currentCostPrice = selectedVariant?.cost_price_override ?? product?.cost_price ?? 0;
  const currentStock = selectedVariant?.stock_qty ?? product?.stock_qty ?? 0;
  const isOutOfStock = currentStock <= 0;
  
  const inCartQuantity = getItemQuantity(
    product?.id || '', 
    selectedVariant?.id
  );

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      price: currentPrice,
      quantity,
      image: product.images?.[0]?.image_url,
      stepQty: product.step_qty,
      minOrderQty: product.min_order_qty,
      stockQty: currentStock,
    });

    toast.success('Savatga qo\'shildi!', {
      description: `${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} - ${quantity} dona`,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Mahsulot topilmadi</h2>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Bosh sahifaga qaytish
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Orqaga
        </Link>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <ProductGallery images={product.images || []} productName={product.name} />

        {/* Details */}
        <div className="space-y-6">
          {/* Category */}
          {product.category && (
            <span className="text-sm text-muted-foreground">
              {product.category.name}
            </span>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(currentPrice)}
            </span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(product.old_price)}
              </span>
            )}
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-destructive' : 'bg-success'}`} />
            <span className={isOutOfStock ? 'text-destructive' : 'text-success'}>
              {isOutOfStock ? 'Mavjud emas' : `Omborda: ${currentStock} ${product.unit}`}
            </span>
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <VariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelectVariant={setSelectedVariant}
              basePrice={product.price}
            />
          )}

          {/* Quantity */}
          <QuantitySelector
            quantity={quantity}
            onQuantityChange={setQuantity}
            min={product.min_order_qty}
            max={currentStock}
            step={product.step_qty}
          />

          {/* Add to cart */}
          <Button
            size="lg"
            className="w-full gap-2 h-14 text-lg"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="w-5 h-5" />
            Savatga qo'shish
            {inCartQuantity > 0 && (
              <span className="ml-2 text-sm opacity-80">
                (savatda: {inCartQuantity})
              </span>
            )}
          </Button>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Yetkazib berish</div>
                <div className="text-muted-foreground">1-3 kun ichida</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">To'lov</div>
                <div className="text-muted-foreground">Naqd, karta, o'tkazma</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pt-6 border-t border-border">
              <h3 className="font-semibold mb-3">Tavsif</h3>
              <p className="text-muted-foreground whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
