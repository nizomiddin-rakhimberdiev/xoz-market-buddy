import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Banknote, Building2, Truck, Store, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationPicker } from '@/components/checkout/LocationPicker';
import { useCartStore } from '@/stores/cartStore';
import { createOrder, formatPrice } from '@/lib/api';
import type { DeliveryType, PaymentType } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryType: 'pickup' as DeliveryType,
    paymentType: 'cash' as PaymentType,
    deliveryAddress: '',
    deliveryLat: 41.2995,
    deliveryLng: 69.2401,
    comment: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalPrice = getTotalPrice();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Ismingizni kiriting';
    }
    
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Telefon raqamini kiriting';
    } else if (!/^\+?998\d{9}$/.test(formData.customerPhone.replace(/\s/g, ''))) {
      newErrors.customerPhone = 'Noto\'g\'ri telefon formati';
    }
    
    if (formData.deliveryType === 'delivery' && !formData.deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Manzilni kiriting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    if (items.length === 0) {
      toast.error('Savat bo\'sh');
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await createOrder({
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        delivery_type: formData.deliveryType,
        delivery_lat: formData.deliveryType === 'delivery' ? formData.deliveryLat : undefined,
        delivery_lng: formData.deliveryType === 'delivery' ? formData.deliveryLng : undefined,
        delivery_address_text: formData.deliveryType === 'delivery' ? formData.deliveryAddress : undefined,
        payment_type: formData.paymentType,
        comment: formData.comment || undefined,
        items: items.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.price,
          cost_price: 0, // Server calculates real cost_price from database
          product_name: `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`,
        })),
      });

      clearCart();
      toast.success('Buyurtma qabul qilindi!', {
        description: `Buyurtma raqami: ${order.order_number}`,
      });
      navigate('/order-success', { state: { orderNumber: order.order_number } });
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Xatolik yuz berdi', {
        description: 'Iltimos, qayta urinib ko\'ring',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-display font-bold mb-4">Savat bo'sh</h2>
          <Link to="/">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Xarid qilish
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
        <Link 
          to="/cart" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Savatga qaytish
        </Link>

        <h1 className="text-xl md:text-3xl font-display font-bold mb-4 sm:mb-8">
          Buyurtmani rasmiylashtirish
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Contact info */}
              <div className="bg-card rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h2 className="font-display font-bold text-base sm:text-lg">Aloqa ma'lumotlari</h2>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ism *</Label>
                    <Input
                      id="name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="To'liq ismingiz"
                      className={errors.customerName ? 'border-destructive' : ''}
                    />
                    {errors.customerName && (
                      <p className="text-sm text-destructive">{errors.customerName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon *</Label>
                    <Input
                      id="phone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="+998 90 123 45 67"
                      className={errors.customerPhone ? 'border-destructive' : ''}
                    />
                    {errors.customerPhone && (
                      <p className="text-sm text-destructive">{errors.customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery type */}
              <div className="bg-card rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h2 className="font-display font-bold text-base sm:text-lg">Yetkazib berish</h2>
                
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'pickup' })}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2',
                      formData.deliveryType === 'pickup'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Store className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">Olib ketish</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">Do'kondan o'zingiz olasiz</div>
                    </div>
                    {formData.deliveryType === 'pickup' && (
                      <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'delivery' })}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2',
                      formData.deliveryType === 'delivery'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Truck className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">Yetkazib berish</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">Manzilingizga yetkazamiz</div>
                    </div>
                    {formData.deliveryType === 'delivery' && (
                      <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                </div>

                {formData.deliveryType === 'delivery' && (
                  <div className="pt-4 border-t border-border">
                    <LocationPicker
                      lat={formData.deliveryLat}
                      lng={formData.deliveryLng}
                      onLocationChange={(lat, lng, address) => {
                        setFormData({
                          ...formData,
                          deliveryLat: lat,
                          deliveryLng: lng,
                          deliveryAddress: address,
                        });
                        // Clear address error when location is selected
                        if (errors.deliveryAddress) {
                          setErrors({ ...errors, deliveryAddress: '' });
                        }
                      }}
                    />
                    {errors.deliveryAddress && (
                      <p className="text-sm text-destructive mt-2">{errors.deliveryAddress}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment type */}
              <div className="bg-card rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h2 className="font-display font-bold text-base sm:text-lg">To'lov usuli</h2>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'cash' })}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 transition-all text-center',
                      formData.paymentType === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Banknote className="w-6 h-6 text-primary mx-auto mb-1" />
                    <div className="font-medium text-xs sm:text-sm">Naqd</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'card' })}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 transition-all text-center',
                      formData.paymentType === 'card'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <CreditCard className="w-6 h-6 text-primary mx-auto mb-1" />
                    <div className="font-medium text-xs sm:text-sm">Karta</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'transfer' })}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 transition-all text-center',
                      formData.paymentType === 'transfer'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Building2 className="w-6 h-6 text-primary mx-auto mb-1" />
                    <div className="font-medium text-xs sm:text-sm">O'tkazma</div>
                  </button>
                </div>
              </div>

              {/* Comment */}
              <div className="bg-card rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h2 className="font-display font-bold text-base sm:text-lg">Izoh (ixtiyoriy)</h2>
                <Textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Buyurtma bo'yicha qo'shimcha ma'lumot..."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-4 sm:p-6 sticky top-24">
                <h2 className="font-display font-bold text-base sm:text-lg mb-3 sm:mb-4">Buyurtma</h2>
                
                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
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

                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Yuborilmoqda...' : 'Buyurtmani tasdiqlash'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
