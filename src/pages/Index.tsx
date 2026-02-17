import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { ProductGrid } from '@/components/products/ProductGrid';
import { getCategories, getProducts } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { Product } from '@/types/database';

const PRODUCTS_PER_PAGE = 20;

export default function Index() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Reset when category or search changes
  useEffect(() => {
    setPage(1);
    setAllProducts([]);
  }, [selectedCategory, searchQuery]);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: productsData, isLoading: productsLoading, isFetching } = useQuery({
    queryKey: ['products', selectedCategory, searchQuery, page],
    queryFn: () =>
      getProducts({
        categoryId: selectedCategory || undefined,
        search: searchQuery || undefined,
        page,
        limit: PRODUCTS_PER_PAGE,
      }),
  });

  // Accumulate products for "load more" pagination
  useEffect(() => {
    if (productsData?.products) {
      if (page === 1) {
        setAllProducts(productsData.products);
      } else {
        setAllProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = productsData.products.filter(p => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
    }
  }, [productsData, page]);

  const totalProducts = productsData?.total || 0;
  const hasMore = allProducts.length < totalProducts;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Hero section */}
        <section className="text-center py-4 sm:py-8 md:py-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-2 sm:mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Xoztovarsga xush kelibsiz!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
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
          <ProductGrid products={allProducts} isLoading={productsLoading && page === 1} />
        </section>

        {/* Load more */}
        {hasMore && !productsLoading && (
          <div className="flex justify-center pt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPage((p) => p + 1)}
              className="gap-2"
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {isFetching ? 'Yuklanmoqda...' : 'Ko\'proq ko\'rsatish'}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
