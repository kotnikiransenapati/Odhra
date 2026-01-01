import React from 'react';
import { motion } from 'framer-motion';
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
          'relative px-4 py-2 rounded-full text-sm font-medium transition-colors',
          selectedCategory === null
            ? 'text-accent-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {selectedCategory === null && (
          <motion.div
            layoutId="categoryBg"
            className="absolute inset-0 bg-accent rounded-full"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          />
        )}
        <span className="relative z-10">All</span>
      </button>
      
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.slug)}
          className={cn(
            'relative px-4 py-2 rounded-full text-sm font-medium transition-colors',
            selectedCategory === category.slug
              ? 'text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {selectedCategory === category.slug && (
            <motion.div
              layoutId="categoryBg"
              className="absolute inset-0 bg-accent rounded-full"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{category.name}</span>
        </button>
      ))}
    </div>
  );
}
