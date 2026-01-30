import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Banknote, Building2, Truck, Store, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
          cost_price: item.price, // Will be updated from product data in production
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

        <h1 className="text-2xl md:text-3xl font-display font-bold mb-8">
          Buyurtmani rasmiylashtirish
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact info */}
              <div className="bg-card rounded-2xl p-6 space-y-4">
                <h2 className="font-display font-bold text-lg">Aloqa ma'lumotlari</h2>
                
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
              <div className="bg-card rounded-2xl p-6 space-y-4">
                <h2 className="font-display font-bold text-lg">Yetkazib berish</h2>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'pickup' })}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3',
                      formData.deliveryType === 'pickup'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Store className="w-6 h-6 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">Olib ketish</div>
                      <div className="text-sm text-muted-foreground">Do'kondan o'zingiz olasiz</div>
                    </div>
                    {formData.deliveryType === 'pickup' && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'delivery' })}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3',
                      formData.deliveryType === 'delivery'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Truck className="w-6 h-6 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">Yetkazib berish</div>
                      <div className="text-sm text-muted-foreground">Manzilingizga yetkazamiz</div>
                    </div>
                    {formData.deliveryType === 'delivery' && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </button>
                </div>

                {formData.deliveryType === 'delivery' && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="address">Manzil *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <Textarea
                          id="address"
                          value={formData.deliveryAddress}
                          onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                          placeholder="To'liq manzilni kiriting..."
                          className={cn('pl-10 min-h-[80px]', errors.deliveryAddress ? 'border-destructive' : '')}
                        />
                      </div>
                      {errors.deliveryAddress && (
                        <p className="text-sm text-destructive">{errors.deliveryAddress}</p>
                      )}
                    </div>
                    
                    {/* Map placeholder */}
                    <div className="rounded-xl overflow-hidden border border-border">
                      <iframe
                        src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d191885.25349753856!2d69.11455563398827!3d41.28269029306466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae8b0cc379e9c3%3A0xa5a9323b4aa5cb98!2sTashkent%2C%20Uzbekistan!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s`}
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment type */}
              <div className="bg-card rounded-2xl p-6 space-y-4">
                <h2 className="font-display font-bold text-lg">To'lov usuli</h2>
                
                <div className="grid sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'cash' })}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-center',
                      formData.paymentType === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Banknote className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Naqd pul</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'card' })}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-center',
                      formData.paymentType === 'card'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Karta</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'transfer' })}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-center',
                      formData.paymentType === 'transfer'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">O'tkazma</div>
                  </button>
                </div>
              </div>

              {/* Comment */}
              <div className="bg-card rounded-2xl p-6 space-y-4">
                <h2 className="font-display font-bold text-lg">Izoh (ixtiyoriy)</h2>
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
              <div className="bg-card rounded-2xl p-6 sticky top-24">
                <h2 className="font-display font-bold text-lg mb-4">Buyurtma</h2>
                
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
