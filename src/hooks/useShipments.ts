import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Shipment {
  id: string;
  sub_order_id: string;
  delivery_partner_id: string | null;
  awb_number: string | null;
  courier_name: string | null;
  pickup_scheduled_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  delivery_attempts: number;
  current_status: string;
  current_location: string | null;
  estimated_delivery_date: string | null;
  actual_weight: number | null;
  volumetric_weight: number | null;
  shipping_label_url: string | null;
  invoice_url: string | null;
  pod_url: string | null;
  delivery_otp: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_code: string;
  event_description: string;
  location: string | null;
  location_city: string | null;
  location_state: string | null;
  timestamp: string;
  created_at: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
}

export function useDeliveryPartners() {
  return useQuery({
    queryKey: ['delivery-partners'],
    queryFn: async (): Promise<DeliveryPartner[]> => {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useShipment(subOrderId: string | undefined) {
  return useQuery({
    queryKey: ['shipment', subOrderId],
    queryFn: async () => {
      if (!subOrderId) return null;

      const { data: shipment, error } = await supabase
        .from('shipments')
        .select('*, delivery_partners(*)')
        .eq('sub_order_id', subOrderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return shipment;
    },
    enabled: !!subOrderId,
  });
}

export function useShipmentEvents(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment-events', shipmentId],
    queryFn: async (): Promise<ShipmentEvent[]> => {
      if (!shipmentId) return [];

      const { data, error } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!shipmentId,
  });
}

export function useShipmentRealtime(shipmentId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!shipmentId) return;

    const channel = supabase
      .channel(`shipment-${shipmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `id=eq.${shipmentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shipment'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shipment_events',
          filter: `shipment_id=eq.${shipmentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shipment-events', shipmentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipmentId, queryClient]);
}

export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sub_order_id: string;
      delivery_partner_id?: string;
      awb_number?: string;
      courier_name?: string;
      estimated_delivery_date?: string;
    }) => {
      const { data: shipment, error } = await supabase
        .from('shipments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment'] });
      toast.success('Shipment created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create shipment');
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      updates,
    }: {
      shipmentId: string;
      updates: Partial<Shipment>;
    }) => {
      const { data, error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment'] });
      toast.success('Shipment updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update shipment');
    },
  });
}

export function useAddShipmentEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      shipment_id: string;
      event_code: string;
      event_description: string;
      location?: string;
      location_city?: string;
      location_state?: string;
      timestamp?: string;
    }) => {
      const { data: event, error } = await supabase
        .from('shipment_events')
        .insert({
          ...data,
          timestamp: data.timestamp || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return event;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-events', variables.shipment_id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add tracking event');
    },
  });
}
