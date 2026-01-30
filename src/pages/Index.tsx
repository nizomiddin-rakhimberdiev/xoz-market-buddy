import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { ProductGrid } from '@/components/products/ProductGrid';
import { getCategories, getProducts } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export default function Index() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Reset page when category or search changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchQuery]);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedCategory, searchQuery, page],
    queryFn: () =>
      getProducts({
        categoryId: selectedCategory || undefined,
        search: searchQuery || undefined,
        page,
        limit: 20,
      }),
  });

  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const hasMore = products.length < totalProducts && page * 20 < totalProducts;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Hero section */}
        <section className="text-center py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Xoztovarsga xush kelibsiz!
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Eng sifatli xo'jalik tovarlari bir joyda. Tez yetkazib berish va qulay narxlar.
          </p>
        </section>

        {/* Category filter */}
        <section>
          <CategoryFilter
            categories={categories || []}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            isLoading={categoriesLoading}
          />
        </section>

        {/* Search results info */}
        {searchQuery && (
          <div className="text-muted-foreground">
            "{searchQuery}" uchun <span className="font-semibold text-foreground">{totalProducts}</span> ta mahsulot topildi
          </div>
        )}

        {/* Products grid */}
        <section>
          <ProductGrid products={products} isLoading={productsLoading} />
        </section>

        {/* Load more */}
        {hasMore && !productsLoading && (
          <div className="flex justify-center pt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPage((p) => p + 1)}
              className="gap-2"
            >
              <ChevronDown className="w-4 h-4" />
              Ko'proq ko'rsatish
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
