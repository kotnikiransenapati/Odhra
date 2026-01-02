import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Home,
  Briefcase,
  Star,
  Loader2,
} from 'lucide-react';

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

const emptyAddress: Omit<Address, 'id'> = {
  label: 'Home',
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  is_default: false,
};

export default function Addresses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Omit<Address, 'id'>>(emptyAddress);

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

  const saveMutation = useMutation({
    mutationFn: async (newAddresses: Address[]) => {
      const { error } = await supabase
        .from('profiles')
        .update({ address_book: JSON.parse(JSON.stringify(newAddresses)) })
        .eq('id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(editingAddress ? 'Address updated' : 'Address added');
      handleCloseDialog();
    },
    onError: () => {
      toast.error('Failed to save address');
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAddress(null);
    setFormData(emptyAddress);
  };

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData({ ...emptyAddress, full_name: user?.user_metadata?.full_name || '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData(address);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.full_name || !formData.phone || !formData.address_line1 || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill in all required fields');
      return;
    }

    let updatedAddresses: Address[];

    if (editingAddress) {
      updatedAddresses = addresses.map((addr) =>
        addr.id === editingAddress.id ? { ...formData, id: editingAddress.id } : addr
      );
    } else {
      const newAddress: Address = {
        ...formData,
        id: crypto.randomUUID(),
        is_default: addresses.length === 0,
      };
      updatedAddresses = [...addresses, newAddress];
    }

    // Handle default address
    if (formData.is_default) {
      updatedAddresses = updatedAddresses.map((addr) => ({
        ...addr,
        is_default: editingAddress ? addr.id === editingAddress.id : addr.id === updatedAddresses[updatedAddresses.length - 1].id,
      }));
    }

    saveMutation.mutate(updatedAddresses);
  };

  const handleDelete = (addressId: string) => {
    const updatedAddresses = addresses.filter((addr) => addr.id !== addressId);
    saveMutation.mutate(updatedAddresses);
  };

  const handleSetDefault = (addressId: string) => {
    const updatedAddresses = addresses.map((addr) => ({
      ...addr,
      is_default: addr.id === addressId,
    }));
    saveMutation.mutate(updatedAddresses);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please login to manage addresses</p>
          <Button asChild>
            <Link to="/auth">Login / Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24">
          <PageLoading text="Loading addresses..." />
        </div>
      </div>
    );
  }

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'work':
      case 'office':
        return Briefcase;
      default:
        return Home;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Account
              </Link>
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display-sm md:text-display-md font-bold">My Addresses</h1>
                <p className="text-muted-foreground mt-1">Manage your delivery addresses</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={handleOpenAdd}>
                    <Plus className="w-4 h-4" /> Add New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={formData.label}
                          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                          placeholder="e.g., Home, Office"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address Line 1 *</Label>
                      <Input
                        value={formData.address_line1}
                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                        placeholder="House/Flat No., Street, Area"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={formData.address_line2 || ''}
                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                        placeholder="Landmark (optional)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City *</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State *</Label>
                        <Input
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pincode *</Label>
                        <Input
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          placeholder="6-digit pincode"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input value={formData.country} disabled />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="is_default" className="text-sm cursor-pointer">
                        Set as default address
                      </Label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Address
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* Address List */}
          {addresses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No addresses yet</h2>
              <p className="text-muted-foreground mb-6">
                Add your first delivery address to get started
              </p>
              <Button className="gap-2" onClick={handleOpenAdd}>
                <Plus className="w-4 h-4" /> Add Address
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address, index) => {
                const LabelIcon = getLabelIcon(address.label);
                return (
                  <motion.div
                    key={address.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`glass ${address.is_default ? 'ring-2 ring-accent' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                              <LabelIcon className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{address.label}</p>
                                {address.is_default && (
                                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-sm">{address.full_name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {address.address_line1}
                                {address.address_line2 && `, ${address.address_line2}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.state} - {address.pincode}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Phone: {address.phone}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(address)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {!address.is_default && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSetDefault(address.id)}
                                  title="Set as default"
                                >
                                  <Star className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDelete(address.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
