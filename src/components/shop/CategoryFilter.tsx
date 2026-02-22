import React from 'react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
          selectedCategory === null
            ? 'bg-accent text-accent-foreground border-accent shadow-sm'
            : 'text-muted-foreground hover:text-foreground border-border/50 hover:border-border hover:bg-secondary/50'
        )}
      >
        All
      </button>
      
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.slug)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
            selectedCategory === category.slug
              ? 'bg-accent text-accent-foreground border-accent shadow-sm'
              : 'text-muted-foreground hover:text-foreground border-border/50 hover:border-border hover:bg-secondary/50'
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
