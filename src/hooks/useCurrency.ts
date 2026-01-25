import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  decimal_places: number;
  is_active: boolean;
  is_default: boolean;
}

const DEFAULT_CURRENCY: Currency = {
  code: 'INR',
  name: 'Indian Rupee',
  symbol: '₹',
  exchange_rate: 1,
  decimal_places: 2,
  is_active: true,
  is_default: true,
};

export function useCurrency() {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  // Load currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (!error && data) {
        setCurrencies(data as Currency[]);
      }
      setIsLoading(false);
    };

    fetchCurrencies();
  }, []);

  // Load user preference
  useEffect(() => {
    const loadPreference = async () => {
      // Check localStorage first
      const stored = localStorage.getItem('preferred_currency');
      if (stored && currencies.length > 0) {
        const currency = currencies.find(c => c.code === stored);
        if (currency) {
          setSelectedCurrency(currency);
          return;
        }
      }

      // If logged in, check profile
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_currency')
          .eq('id', user.id)
          .single();

        if (data?.preferred_currency) {
          const currency = currencies.find(c => c.code === data.preferred_currency);
          if (currency) {
            setSelectedCurrency(currency);
            localStorage.setItem('preferred_currency', currency.code);
          }
        }
      }
    };

    if (currencies.length > 0) {
      loadPreference();
    }
  }, [user, currencies]);

  const changeCurrency = useCallback(async (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    if (!currency) return;

    setSelectedCurrency(currency);
    localStorage.setItem('preferred_currency', currencyCode);

    // Update profile if logged in
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: currencyCode })
        .eq('id', user.id);
    }
  }, [currencies, user]);

  const formatPrice = useCallback((priceInINR: number, showSymbol = true): string => {
    const convertedPrice = priceInINR * selectedCurrency.exchange_rate;
    const formatted = convertedPrice.toLocaleString('en-IN', {
      minimumFractionDigits: selectedCurrency.decimal_places,
      maximumFractionDigits: selectedCurrency.decimal_places,
    });
    return showSymbol ? `${selectedCurrency.symbol}${formatted}` : formatted;
  }, [selectedCurrency]);

  const convertPrice = useCallback((priceInINR: number): number => {
    return Math.round(priceInINR * selectedCurrency.exchange_rate * 100) / 100;
  }, [selectedCurrency]);

  return {
    currencies,
    selectedCurrency,
    changeCurrency,
    formatPrice,
    convertPrice,
    isLoading,
  };
}
