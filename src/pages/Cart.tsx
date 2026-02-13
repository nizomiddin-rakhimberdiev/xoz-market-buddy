import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/lib/api';

export default function Cart() {
  const { items, removeItem, incrementQuantity, decrementQuantity, getTotalPrice, clearCart } = useCartStore();
  const totalPrice = getTotalPrice();

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <ShoppingBag className="w-20 h-20 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-display font-bold mb-2">Savat bo'sh</h2>
          <p className="text-muted-foreground mb-6">Mahsulotlar qo'shing va bu yerda ko'ring</p>
          <Link to="/">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Xarid qilishni boshlash
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <h1 className="text-xl md:text-3xl font-display font-bold">
            Savat ({items.length})
          </h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearCart}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Tozalash
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-2.5 sm:space-y-4">
            {items.map((item) => (
              <div 
                key={`${item.productId}-${item.variantId}`}
                className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 flex gap-3 sm:gap-4 animate-fade-in"
              >
                {/* Image */}
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-secondary rounded-lg sm:rounded-xl overflow-hidden shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium line-clamp-2">{item.name}</h3>
                  {item.variantName && (
                    <p className="text-sm text-muted-foreground">{item.variantName}</p>
                  )}
                  <p className="text-sm sm:text-lg font-bold text-primary mt-0.5 sm:mt-1">
                    {formatPrice(item.price)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.productId, item.variantId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center bg-secondary rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (item.quantity <= item.minOrderQty) {
                          removeItem(item.productId, item.variantId);
                        } else {
                          decrementQuantity(item.productId, item.variantId);
                        }
                      }}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => incrementQuantity(item.productId, item.variantId)}
                      disabled={item.quantity >= item.stockQty}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
              <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 sticky top-24">
              <h2 className="font-display font-bold text-base sm:text-lg mb-3 sm:mb-4">Buyurtma</h2>
              
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div 
                    key={`${item.productId}-${item.variantId}`}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground truncate mr-2">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Jami:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              <Link to="/checkout">
                <Button className="w-full gap-2 h-12" size="lg">
                  Buyurtma berish
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to="/" className="block mt-3">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Xaridni davom ettirish
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
