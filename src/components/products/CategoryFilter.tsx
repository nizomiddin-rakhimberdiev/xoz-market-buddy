import { cn } from '@/lib/utils';
import type { Category } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading,
}: CategoryFilterProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'category-chip shrink-0',
          !selectedCategory && 'active'
        )}
      >
        Hammasi
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'category-chip shrink-0',
            selectedCategory === category.id && 'active'
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
