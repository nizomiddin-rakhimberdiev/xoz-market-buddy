import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Phone, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';

export default function OrderSuccess() {
  const location = useLocation();
  const orderNumber = location.state?.orderNumber;

  if (!orderNumber) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>

        <h1 className="text-2xl md:text-3xl font-display font-bold mb-4">
          Buyurtma qabul qilindi!
        </h1>

        <p className="text-muted-foreground mb-2">
          Buyurtma raqami:
        </p>
        <p className="text-2xl font-bold text-primary mb-6">
          {orderNumber}
        </p>

        <p className="text-muted-foreground mb-8">
          Tez orada operatorimiz siz bilan bog'lanadi va buyurtmani tasdiqlaydi.
        </p>

        <div className="bg-card rounded-2xl p-6 mb-8">
          <p className="text-sm text-muted-foreground mb-3">Savollar bo'lsa:</p>
          <a 
            href="tel:+998901234567"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Phone className="w-5 h-5" />
            +998 90 123 45 67
          </a>
        </div>

        <Link to="/">
          <Button className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Bosh sahifaga qaytish
          </Button>
        </Link>
      </div>
    </MainLayout>
  );
}
