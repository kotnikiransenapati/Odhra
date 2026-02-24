import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

// ── Types ──

export interface IndiaPostShipment {
  id: string;
  order_id: string | null;
  sub_order_id: string | null;
  consignment_number: string;
  article_type: string;
  booking_date: string | null;
  sender_name: string | null;
  sender_pincode: string | null;
  receiver_name: string | null;
  receiver_pincode: string | null;
  destination_pincode: string | null;
  origin_pincode: string | null;
  weight_grams: number | null;
  declared_value: number | null;
  cod_amount: number | null;
  current_status: string;
  current_location: string | null;
  expected_delivery_date: string | null;
  delivered_at: string | null;
  last_tracked_at: string | null;
  tracking_events: TrackingEvent[] | any;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  status: string;
  location: string;
  description: string;
  timestamp: string;
}

export interface PincodeInfo {
  pincode: string;
  office_name: string | null;
  office_type: string | null;
  delivery_status: string | null;
  division: string | null;
  region: string | null;
  circle: string | null;
  district: string | null;
  state: string | null;
  country: string;
  services_available: string[];
  is_serviceable: boolean;
}

export interface ShippingRate {
  service_type: string;
  zone: string;
  base_rate: number;
  cod_charge: number;
  insurance: number;
  total_rate: number;
  estimated_days_min: number;
  estimated_days_max: number;
  weight_grams: number;
}

// ── Edge function caller ──

async function callIndiaPost(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('indiapost-proxy', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Unknown error');
  return data.data;
}

// ── Hooks ──

export function useIndiaPostPincode(pincode: string) {
  return useQuery<PincodeInfo | null>({
    queryKey: ['indiapost-pincode', pincode],
    queryFn: () => callIndiaPost('check_pincode', { pincode }),
    enabled: /^\d{6}$/.test(pincode),
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days cache
    retry: 1,
  });
}

export function useIndiaPostRate(params: {
  origin_pincode: string;
  destination_pincode: string;
  weight_grams: number;
  service_type?: string;
  declared_value?: number;
  cod?: boolean;
}) {
  const enabled = /^\d{6}$/.test(params.origin_pincode) && /^\d{6}$/.test(params.destination_pincode) && params.weight_grams > 0;

  return useQuery<ShippingRate>({
    queryKey: ['indiapost-rate', params],
    queryFn: () => callIndiaPost('calculate_rate', params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIndiaPostAvailableServices(originPincode: string, destPincode: string, weightGrams = 500) {
  const enabled = /^\d{6}$/.test(originPincode) && /^\d{6}$/.test(destPincode);

  return useQuery<ShippingRate[]>({
    queryKey: ['indiapost-services', originPincode, destPincode, weightGrams],
    queryFn: () => callIndiaPost('available_services', {
      origin_pincode: originPincode,
      destination_pincode: destPincode,
      weight_grams: weightGrams,
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIndiaPostTrack(trackingNumber: string | undefined) {
  return useQuery<IndiaPostShipment | null>({
    queryKey: ['indiapost-track', trackingNumber],
    queryFn: () => trackingNumber ? callIndiaPost('track', { tracking_number: trackingNumber }) : null,
    enabled: !!trackingNumber,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
  });
}

export function useIndiaPostShipmentByOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['indiapost-shipment-order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('indiapost_shipments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as IndiaPostShipment[];
    },
    enabled: !!orderId,
  });
}

export function useIndiaPostShipments(filters?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['indiapost-shipments', filters],
    queryFn: async () => {
      let query = supabase
        .from('indiapost_shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('current_status', filters.status);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as IndiaPostShipment[];
    },
  });
}

// ── Realtime subscription ──

export function useIndiaPostRealtime(consignmentNumber: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!consignmentNumber) return;

    const channel = supabase
      .channel(`indiapost-${consignmentNumber}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'indiapost_shipments', filter: `consignment_number=eq.${consignmentNumber}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['indiapost-track', consignmentNumber] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [consignmentNumber, queryClient]);
}

// ── Mutations ──

export function useCreateIndiaPostShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      order_id?: string;
      sub_order_id?: string;
      consignment_number: string;
      article_type?: string;
      sender_name: string;
      sender_pincode: string;
      receiver_name: string;
      receiver_pincode: string;
      weight_grams: number;
      declared_value?: number;
      cod_amount?: number;
      expected_delivery_date?: string;
    }) => callIndiaPost('create_shipment', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indiapost-shipments'] });
      toast.success('India Post shipment created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create shipment'),
  });
}

export function useUpdateIndiaPostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      consignment_number: string;
      status: string;
      location?: string;
      description?: string;
    }) => callIndiaPost('update_status', params),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['indiapost-track', vars.consignment_number] });
      queryClient.invalidateQueries({ queryKey: ['indiapost-shipments'] });
      toast.success('Shipment status updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update status'),
  });
}

// ── Rate card admin hooks ──

export function useIndiaPostRateCards() {
  return useQuery({
    queryKey: ['indiapost-rate-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indiapost_rate_cards')
        .select('*')
        .order('service_type')
        .order('zone')
        .order('weight_slab_min_grams');
      if (error) throw error;
      return data || [];
    },
  });
}
