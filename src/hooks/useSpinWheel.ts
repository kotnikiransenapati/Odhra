import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SpinEligibility {
  can_spin: boolean;
  reason: string;
  code?: string;
  expires_at?: string;
  discount_value?: number;
  discount_type?: string;
  qualifying_order_id?: string;
  qualifying_order_amount?: number;
  required_order_amount?: number;
}

interface Prize {
  id: string;
  label: string;
  color: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  code?: string;
}

const defaultPrizes: Prize[] = [
  { id: '1', label: '10% OFF', color: 'hsl(45, 93%, 47%)', discount: 10, discountType: 'percentage' },
  { id: '2', label: 'Try Again', color: 'hsl(220, 14%, 96%)' },
  { id: '3', label: '20% OFF', color: 'hsl(142, 76%, 36%)', discount: 20, discountType: 'percentage' },
  { id: '4', label: '₹100 OFF', color: 'hsl(199, 89%, 48%)', discount: 100, discountType: 'fixed' },
  { id: '5', label: 'Try Again', color: 'hsl(220, 14%, 96%)' },
  { id: '6', label: '₹500 OFF', color: 'hsl(280, 65%, 60%)', discount: 500, discountType: 'fixed' },
  { id: '7', label: 'Try Again', color: 'hsl(220, 14%, 96%)' },
  { id: '8', label: '15% OFF', color: 'hsl(0, 84%, 60%)', discount: 15, discountType: 'percentage' },
];

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SPIN';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useSpinWheel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSpinning, setIsSpinning] = useState(false);

  // Check if user can spin
  const { data: eligibility, isLoading: checkingEligibility, refetch: recheckEligibility } = useQuery({
    queryKey: ['spin-eligibility', user?.id],
    queryFn: async (): Promise<SpinEligibility> => {
      if (!user) {
        return { can_spin: false, reason: 'not_logged_in' };
      }

      const { data, error } = await supabase.rpc('can_user_spin', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking spin eligibility:', error);
        throw error;
      }

      return data as unknown as SpinEligibility;
    },
    enabled: !!user,
  });

  // Create spin entry mutation
  const createSpinEntry = useMutation({
    mutationFn: async (prize: Prize) => {
      if (!user) throw new Error('Must be logged in');
      if (!prize.discount) throw new Error('No discount prize');

      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data: entry, error } = await supabase
        .from('spin_wheel_entries')
        .insert({
          user_id: user.id,
          code,
          discount_type: prize.discountType || 'percentage',
          discount_value: prize.discount,
          expires_at: expiresAt.toISOString(),
          qualifying_order_id: eligibility?.qualifying_order_id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Also create a promotion entry for the code to work at checkout
      const { error: promoError } = await supabase
        .from('promotions')
        .insert({
          name: `Spin Wheel - ${code}`,
          code,
          type: 'spin_wheel',
          discount_type: prize.discountType || 'percentage',
          discount_value: prize.discount,
          is_active: true,
          starts_at: new Date().toISOString(),
          ends_at: expiresAt.toISOString(),
          per_user_limit: 1,
          usage_limit: 1,
          metadata: { spin_entry_id: entry.id }
        });

      if (promoError) {
        console.error('Error creating promotion:', promoError);
        // Don't throw, the spin entry is still valid
      }

      return { entry, code };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-eligibility'] });
    }
  });

  // Spin function
  const spin = useCallback(async (prizes: Prize[] = defaultPrizes): Promise<{ prize: Prize; code?: string }> => {
    if (!user) {
      toast.error('Please log in to spin the wheel');
      throw new Error('Not logged in');
    }

    if (!eligibility?.can_spin) {
      toast.error('You cannot spin right now');
      throw new Error('Cannot spin');
    }

    setIsSpinning(true);

    // Weighted random selection
    const winningPrizes = prizes.filter(p => p.discount);
    const tryAgainPrizes = prizes.filter(p => !p.discount);
    
    // 60% chance to win, 40% chance for try again
    const randomChance = Math.random();
    let selectedPrize: Prize;

    if (randomChance < 0.4 && tryAgainPrizes.length > 0) {
      selectedPrize = tryAgainPrizes[Math.floor(Math.random() * tryAgainPrizes.length)];
    } else if (winningPrizes.length > 0) {
      selectedPrize = winningPrizes[Math.floor(Math.random() * winningPrizes.length)];
    } else {
      selectedPrize = prizes[Math.floor(Math.random() * prizes.length)];
    }

    try {
      let code: string | undefined;

      if (selectedPrize.discount) {
        const result = await createSpinEntry.mutateAsync(selectedPrize);
        code = result.code;
      } else {
        // Even for "Try Again", record the spin
        await supabase
          .from('spin_wheel_entries')
          .insert({
            user_id: user.id,
            code: 'TRYAGAIN_' + Date.now(),
            discount_type: 'percentage',
            discount_value: 0,
            expires_at: new Date().toISOString(),
            status: 'expired' // Mark as expired immediately
          });
        
        queryClient.invalidateQueries({ queryKey: ['spin-eligibility'] });
      }

      setIsSpinning(false);
      return { prize: selectedPrize, code };
    } catch (error) {
      setIsSpinning(false);
      throw error;
    }
  }, [user, eligibility, createSpinEntry, queryClient]);

  // Get user's active code
  const { data: activeCode } = useQuery({
    queryKey: ['active-spin-code', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('spin_wheel_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  return {
    eligibility,
    isLoading: checkingEligibility,
    isSpinning,
    spin,
    activeCode,
    recheckEligibility,
    prizes: defaultPrizes
  };
}
