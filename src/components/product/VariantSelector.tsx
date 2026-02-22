import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { haptic } from '@/lib/haptics';

interface VariantOption {
  id: string;
  name: string;
  values: string[];
  sort_order: number;
}

interface ProductVariant {
  id: string;
  sku: string | null;
  option_values: Record<string, string>;
  price_adjustment: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
}

interface VariantSelectorProps {
  productId: string;
  basePrice: number;
  onVariantChange: (variant: ProductVariant | null, selectedOptions: Record<string, string>) => void;
  onImageChange?: (imageUrl: string) => void;
}

export function VariantSelector({ productId, basePrice, onVariantChange, onImageChange }: VariantSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const { data: variantOptions = [] } = useQuery({
    queryKey: ['variant-options', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variant_options')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as VariantOption[];
    },
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        option_values: (v.option_values as Record<string, string>) || {},
        price_adjustment: Number(v.price_adjustment) || 0,
      })) as ProductVariant[];
    },
  });

  // Find matching variant when selections change
  useEffect(() => {
    if (variantOptions.length === 0) return;
    
    const allSelected = variantOptions.every(opt => selectedOptions[opt.name]);
    if (!allSelected) {
      onVariantChange(null, selectedOptions);
      return;
    }

    const matchingVariant = variants.find(v => 
      variantOptions.every(opt => v.option_values[opt.name] === selectedOptions[opt.name])
    );

    onVariantChange(matchingVariant || null, selectedOptions);
    
    if (matchingVariant?.image_url && onImageChange) {
      onImageChange(matchingVariant.image_url);
    }
  }, [selectedOptions, variants, variantOptions]);

  // Auto-select first option for each variant
  useEffect(() => {
    if (variantOptions.length > 0 && Object.keys(selectedOptions).length === 0) {
      const defaults: Record<string, string> = {};
      variantOptions.forEach(opt => {
        if (opt.values.length > 0) defaults[opt.name] = opt.values[0];
      });
      setSelectedOptions(defaults);
    }
  }, [variantOptions]);

  const isValueAvailable = (optionName: string, value: string) => {
    const testSelection = { ...selectedOptions, [optionName]: value };
    return variants.some(v => {
      return variantOptions.every(opt => {
        if (opt.name === optionName) return v.option_values[opt.name] === value;
        if (!testSelection[opt.name]) return true;
        return v.option_values[opt.name] === testSelection[opt.name];
      }) && v.stock > 0;
    });
  };

  const handleSelect = (optionName: string, value: string) => {
    haptic('light');
    setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
  };

  if (variantOptions.length === 0) return null;

  // Color swatch map
  const colorMap: Record<string, string> = {
    'Red': 'bg-red-500', 'Blue': 'bg-blue-500', 'Green': 'bg-green-500',
    'Black': 'bg-black', 'White': 'bg-white border-2 border-border',
    'Navy': 'bg-blue-900', 'Pink': 'bg-pink-400', 'Yellow': 'bg-yellow-400',
    'Purple': 'bg-purple-500', 'Orange': 'bg-orange-500', 'Gray': 'bg-gray-400',
    'Grey': 'bg-gray-400', 'Brown': 'bg-amber-800', 'Beige': 'bg-amber-200',
    'Maroon': 'bg-red-900', 'Teal': 'bg-teal-500', 'Cream': 'bg-amber-50 border-2 border-border',
  };

  return (
    <div className="space-y-5">
      {variantOptions.map((option) => {
        const isColor = option.name.toLowerCase() === 'color' || option.name.toLowerCase() === 'colour';
        
        return (
          <div key={option.id}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold">{option.name}</span>
              {selectedOptions[option.name] && (
                <span className="text-sm text-muted-foreground">{selectedOptions[option.name]}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selectedOptions[option.name] === value;
                const available = isValueAvailable(option.name, value);
                
                if (isColor) {
                  const colorClass = colorMap[value] || 'bg-muted';
                  return (
                    <motion.button
                      key={value}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSelect(option.name, value)}
                      disabled={!available}
                      title={value}
                      className={cn(
                        'w-9 h-9 rounded-full transition-all duration-200 relative',
                        colorClass,
                        isSelected && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
                        !available && 'opacity-30 cursor-not-allowed',
                      )}
                    >
                      {!available && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-px bg-destructive rotate-45" />
                        </div>
                      )}
                    </motion.button>
                  );
                }

                return (
                  <motion.button
                    key={value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(option.name, value)}
                    disabled={!available}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 min-w-[48px]',
                      isSelected
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-background hover:border-accent/50',
                      !available && 'opacity-40 cursor-not-allowed line-through',
                    )}
                  >
                    {value}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Show selected variant info */}
      {Object.keys(selectedOptions).length === variantOptions.length && (() => {
        const matchingVariant = variants.find(v => 
          variantOptions.every(opt => v.option_values[opt.name] === selectedOptions[opt.name])
        );
        if (!matchingVariant) return (
          <Badge variant="destructive" className="text-xs">This combination is unavailable</Badge>
        );
        if (matchingVariant.stock <= 3 && matchingVariant.stock > 0) return (
          <Badge variant="destructive" className="text-xs animate-pulse">Only {matchingVariant.stock} left!</Badge>
        );
        return null;
      })()}
    </div>
  );
}
