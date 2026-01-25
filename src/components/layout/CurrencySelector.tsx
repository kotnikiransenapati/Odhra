import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/hooks/useCurrency';
import { Globe } from 'lucide-react';

export function CurrencySelector() {
  const { currencies, selectedCurrency, changeCurrency, isLoading } = useCurrency();

  if (isLoading || currencies.length <= 1) return null;

  return (
    <Select value={selectedCurrency.code} onValueChange={changeCurrency}>
      <SelectTrigger className="w-auto h-8 gap-1 border-none bg-transparent hover:bg-accent/10 px-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <SelectValue>
          <span className="font-medium">{selectedCurrency.code}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span className="flex items-center gap-2">
              <span className="font-medium">{currency.symbol}</span>
              <span>{currency.name}</span>
              <span className="text-muted-foreground">({currency.code})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
