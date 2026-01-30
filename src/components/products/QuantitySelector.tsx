import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function QuantitySelector({
  quantity,
  onQuantityChange,
  min = 1,
  max = 999,
  step = 1,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    const newQty = Math.max(min, quantity - step);
    onQuantityChange(newQty);
  };

  const handleIncrement = () => {
    const newQty = Math.min(max, quantity + step);
    onQuantityChange(newQty);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Miqdor:</span>
      <div className="flex items-center bg-secondary rounded-xl">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-l-xl rounded-r-none"
          onClick={handleDecrement}
          disabled={quantity <= min}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-12 text-center font-semibold">{quantity}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-r-xl rounded-l-none"
          onClick={handleIncrement}
          disabled={quantity >= max}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
