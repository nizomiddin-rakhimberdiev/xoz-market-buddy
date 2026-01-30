import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/lib/api';
import type { Product } from '@/types/database';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images?.find((img) => img.is_main) || product.images?.[0];
  const { addItem, incrementQuantity, decrementQuantity, getItemQuantity, removeItem } = useCartStore();
  
  const quantity = getItemQuantity(product.id);
  const isInCart = quantity > 0;
  const isOutOfStock = product.stock_qty <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: mainImage?.image_url,
      stepQty: product.step_qty,
      minOrderQty: product.min_order_qty,
      stockQty: product.stock_qty,
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    incrementQuantity(product.id);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity <= product.min_order_qty) {
      removeItem(product.id);
    } else {
      decrementQuantity(product.id);
    }
  };

  return (
    <Link to={`/products/${product.slug}`} className="block">
      <div className="product-card group">
        {/* Image */}
        <div className="relative aspect-square bg-secondary overflow-hidden">
          {mainImage ? (
            <img
              src={mainImage.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Package className="w-12 h-12" />
            </div>
          )}
          
          {/* Discount badge */}
          {product.old_price && product.old_price > product.price && (
            <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-2 py-1 rounded-lg text-xs font-bold">
              -{Math.round((1 - product.price / product.old_price) * 100)}%
            </div>
          )}
          
          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Mavjud emas</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-end gap-2">
            <span className="price-tag text-lg">{formatPrice(product.price)}</span>
            {product.old_price && product.old_price > product.price && (
              <span className="price-old">{formatPrice(product.old_price)}</span>
            )}
          </div>

          {/* Add to cart */}
          <div className="pt-1">
            {!isInCart ? (
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="w-full gap-2"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Savatga
              </Button>
            ) : (
              <div className="flex items-center justify-between bg-primary/10 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:bg-primary/20"
                  onClick={handleDecrement}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-primary min-w-[2rem] text-center">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:bg-primary/20"
                  onClick={handleIncrement}
                  disabled={quantity >= product.stock_qty}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
