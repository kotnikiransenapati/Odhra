import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { MapPin, Home, Briefcase, Check, Plus } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

interface AddressBookPickerProps {
  onSelectAddress: (address: Omit<Address, 'id' | 'label' | 'is_default'>) => void;
  selectedAddressId?: string;
  onAddressIdChange?: (id: string) => void;
}

export function AddressBookPicker({ 
  onSelectAddress, 
  selectedAddressId,
  onAddressIdChange 
}: AddressBookPickerProps) {
  const { user } = useAuth();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: profile } = await supabase
        .from('profiles')
        .select('address_book')
        .eq('id', user.id)
        .single();

      return (profile?.address_book as unknown as Address[]) || [];
    },
    enabled: !!user,
  });

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'work':
      case 'office':
        return Briefcase;
      default:
        return Home;
    }
  };

  const handleSelect = (address: Address) => {
    onAddressIdChange?.(address.id);
    onSelectAddress({
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No saved addresses found. Add an address for faster checkout.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/addresses">
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Select a saved address
        </p>
        <Button variant="link" size="sm" className="h-auto p-0" asChild>
          <Link to="/addresses">Manage Addresses</Link>
        </Button>
      </div>
      
      <div className="grid gap-3">
        {addresses.map((address) => {
          const LabelIcon = getLabelIcon(address.label);
          const isSelected = selectedAddressId === address.id;
          
          return (
            <Card 
              key={address.id}
              className={`cursor-pointer transition-all hover:border-accent/50 ${
                isSelected ? 'ring-2 ring-accent border-accent' : ''
              }`}
              onClick={() => handleSelect(address)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-accent text-accent-foreground' : 'bg-muted'
                  }`}>
                    {isSelected ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <LabelIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{address.label}</span>
                      {address.is_default && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{address.full_name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {address.address_line1}
                      {address.address_line2 && `, ${address.address_line2}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      📞 {address.phone}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
