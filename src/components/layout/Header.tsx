import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Menu, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCartStore } from '@/stores/cartStore';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const totalItems = useCartStore((state) => state.getTotalItems());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 font-display text-xl font-bold text-primary shrink-0"
          >
            <Package className="w-7 h-7" />
            <span className="hidden sm:inline">Xoztovars</span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Mahsulotlarni qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-icon w-full bg-secondary/50 border-0 focus-visible:ring-primary"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="cart-badge">{totalItems > 99 ? '99+' : totalItems}</span>
                )}
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-6 pt-6">
                  <form onSubmit={handleSearch} className="flex">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Qidirish..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-icon"
                      />
                    </div>
                  </form>
                  
                  <nav className="flex flex-col gap-2">
                    <Link 
                      to="/" 
                      className="px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Bosh sahifa
                    </Link>
                    <Link 
                      to="/cart" 
                      className="px-4 py-3 rounded-lg hover:bg-secondary transition-colors flex items-center justify-between"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>Savat</span>
                      {totalItems > 0 && (
                        <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-sm">
                          {totalItems}
                        </span>
                      )}
                    </Link>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Mahsulotlarni qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-icon bg-secondary/50 border-0"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
