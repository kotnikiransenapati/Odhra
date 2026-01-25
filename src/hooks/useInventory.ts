import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InventoryLocation {
  id: string;
  vendor_id: string;
  name: string;
  code: string;
  address: Record<string, any> | null;
  is_default: boolean;
  is_active: boolean;
}

export interface InventoryLevel {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  reserved_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  location?: InventoryLocation;
  product?: {
    id: string;
    title: string;
    sku: string;
  };
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  location_id: string;
  quantity_change: number;
  movement_type: string;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export function useInventory(vendorId?: string) {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [levels, setLevels] = useState<InventoryLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLocations = useCallback(async () => {
    if (!vendorId) return;
    
    const { data, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (!error && data) {
      setLocations(data as InventoryLocation[]);
    }
  }, [vendorId]);

  const fetchLevels = useCallback(async (productId?: string) => {
    if (!vendorId) return;
    setIsLoading(true);

    let query = supabase
      .from('inventory_levels')
      .select(`
        *,
        location:inventory_locations(*),
        product:products(id, title, sku)
      `)
      .eq('location.vendor_id', vendorId);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLevels(data as InventoryLevel[]);
    }
    setIsLoading(false);
  }, [vendorId]);

  const createLocation = useCallback(async (location: Omit<InventoryLocation, 'id'>) => {
    const { data, error } = await supabase
      .from('inventory_locations')
      .insert(location)
      .select()
      .single();

    if (error) {
      toast.error('Failed to create location');
      return null;
    }

    toast.success('Location created');
    await fetchLocations();
    return data as InventoryLocation;
  }, [fetchLocations]);

  const adjustStock = useCallback(async (
    productId: string,
    locationId: string,
    quantityChange: number,
    movementType: string,
    notes?: string
  ) => {
    setIsLoading(true);

    try {
      // Check if inventory level exists
      const { data: existingLevel } = await supabase
        .from('inventory_levels')
        .select('*')
        .eq('product_id', productId)
        .eq('location_id', locationId)
        .single();

      if (existingLevel) {
        // Update existing level
        const newQuantity = existingLevel.quantity + quantityChange;
        if (newQuantity < 0) {
          toast.error('Cannot reduce below 0');
          return false;
        }

        await supabase
          .from('inventory_levels')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', existingLevel.id);
      } else {
        // Create new level
        if (quantityChange < 0) {
          toast.error('Cannot set negative initial stock');
          return false;
        }

        await supabase
          .from('inventory_levels')
          .insert({
            product_id: productId,
            location_id: locationId,
            quantity: quantityChange,
          });
      }

      // Record movement
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          location_id: locationId,
          quantity_change: quantityChange,
          movement_type: movementType,
          reference_type: 'manual',
          notes,
        });

      // Update main product stock
      const { data: allLevels } = await supabase
        .from('inventory_levels')
        .select('quantity')
        .eq('product_id', productId);

      const totalStock = allLevels?.reduce((sum, l) => sum + l.quantity, 0) || 0;

      await supabase
        .from('products')
        .update({ stock: totalStock })
        .eq('id', productId);

      toast.success('Stock adjusted');
      await fetchLevels();
      return true;
    } catch (err) {
      toast.error('Failed to adjust stock');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchLevels]);

  const getMovementHistory = useCallback(async (productId: string, limit = 50) => {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching movements:', error);
      return [];
    }

    return data as InventoryMovement[];
  }, []);

  const getLowStockProducts = useCallback(async () => {
    if (!vendorId) return [];

    const { data, error } = await supabase
      .from('inventory_levels')
      .select(`
        *,
        product:products(id, title, sku, low_stock_threshold),
        location:inventory_locations(*)
      `)
      .eq('location.vendor_id', vendorId);

    if (error) return [];

    // Filter to products below reorder point
    return (data as InventoryLevel[]).filter(level => {
      const threshold = level.reorder_point || 10;
      return level.quantity <= threshold;
    });
  }, [vendorId]);

  return {
    locations,
    levels,
    isLoading,
    fetchLocations,
    fetchLevels,
    createLocation,
    adjustStock,
    getMovementHistory,
    getLowStockProducts,
  };
}
