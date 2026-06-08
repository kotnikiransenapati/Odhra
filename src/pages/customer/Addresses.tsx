import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';
import { usePincodeAutofill } from '@/hooks/usePincodeAutofill';
import {
  ArrowLeft, MapPin, Plus, Edit2, Trash2, Home, Briefcase, Star, Loader2, CheckCircle2,
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

  // Pincode autofill
  const { data: pincodeData, isLoading: pincodeLoading } = usePincodeAutofill(formData.pincode);
  useEffect(() => {
    if (pincodeData && (!formData.city || !formData.state)) {
      setFormData((prev) => ({ ...prev, city: prev.city || pincodeData.city, state: prev.state || pincodeData.state }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeData]);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: profile } = await supabase.from('profiles').select('address_book').eq('id', user.id).single();
      return (profile?.address_book as unknown as Address[]) || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (newAddresses: Address[]) => {
      const { error } = await supabase.from('profiles')
        .update({ address_book: JSON.parse(JSON.stringify(newAddresses)) })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      haptic('success');
      toast.success(editingAddress ? 'Address updated' : 'Address added');
      handleCloseDialog();
    },
    onError: () => { haptic('error'); toast.error('Failed to save address'); },
  });

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingAddress(null); setFormData(emptyAddress); };

  const handleOpenAdd = () => {
    haptic('light');
    setEditingAddress(null);
    setFormData({ ...emptyAddress, full_name: user?.user_metadata?.full_name || '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (address: Address) => {
    haptic('light');
    setEditingAddress(address);
    setFormData(address);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.full_name?.trim() || formData.full_name.trim().length < 2) return toast.error('Please enter a valid full name');
    const phoneClean = formData.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phoneClean)) return toast.error('Please enter a valid 10-digit Indian mobile number');
    if (!formData.address_line1?.trim() || formData.address_line1.trim().length < 5) return toast.error('Please enter a valid address');
    if (!formData.city?.trim()) return toast.error('Please enter a valid city');
    if (!formData.state?.trim()) return toast.error('Please enter a valid state');
    if (!/^\d{6}$/.test(formData.pincode)) return toast.error('Please enter a valid 6-digit pincode');

    let updated: Address[];
    if (editingAddress) {
      updated = addresses.map((a) => (a.id === editingAddress.id ? { ...formData, id: editingAddress.id } : a));
    } else {
      const next: Address = { ...formData, id: crypto.randomUUID(), is_default: addresses.length === 0 || formData.is_default };
      updated = [...addresses, next];
    }
    if (formData.is_default) {
      const targetId = editingAddress?.id ?? updated[updated.length - 1].id;
      updated = updated.map((a) => ({ ...a, is_default: a.id === targetId }));
    }
    saveMutation.mutate(updated);
  };

  const handleDelete = (id: string) => {
    haptic('warning');
    saveMutation.mutate(addresses.filter((a) => a.id !== id));
  };

  const handleSetDefault = (id: string) => {
    haptic('selection');
    saveMutation.mutate(addresses.map((a) => ({ ...a, is_default: a.id === id })));
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="flex flex-col items-center justify-center h-[60vh] px-4">
          <MapPin className="w-16 h-16 text-muted-foreground mb-4" aria-hidden />
          <h1 className="text-xl font-semibold mb-2">Login required</h1>
          <p className="text-muted-foreground mb-6">Please login to manage addresses</p>
          <Button asChild><Link to="/auth">Login / Sign Up</Link></Button>
        </main>
      </div>
    );
  }

  const getLabelIcon = (label: string) => (['work', 'office'].includes(label.toLowerCase()) ? Briefcase : Home);

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <a href="#addr-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-accent-foreground focus:shadow-lg">Skip to main content</a>
      <Navbar />

      <main id="addr-main" tabIndex={-1} className="pt-24 pb-16 px-4 focus:outline-none" aria-labelledby="addr-heading">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Button variant="ghost" asChild className="mb-3 -ml-3" onClick={() => haptic('light')}>
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden /> Back to Account
              </Link>
            </Button>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 id="addr-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">My Addresses</h1>
                <p className="text-muted-foreground text-sm mt-1" aria-live="polite">
                  {addresses.length === 0 ? 'No saved addresses' : `${addresses.length} saved address${addresses.length === 1 ? '' : 'es'}`}
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(o) => (o ? handleOpenAdd() : handleCloseDialog())}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={handleOpenAdd}>
                    <Plus className="w-4 h-4" aria-hidden /> Add new
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingAddress ? 'Edit address' : 'Add new address'}</DialogTitle>
                    <DialogDescription>
                      Enter a 6-digit pincode and we'll auto-fill the city & state.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addr-label">Label</Label>
                        <Input id="addr-label" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} placeholder="e.g., Home, Office" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addr-name">Full name *</Label>
                        <Input id="addr-name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="John Doe" autoComplete="name" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr-phone">Phone *</Label>
                      <Input id="addr-phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="10-digit mobile number" inputMode="tel" autoComplete="tel-national" maxLength={10} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr-l1">Address line 1 *</Label>
                      <Input id="addr-l1" value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} placeholder="House/Flat No., Street, Area" autoComplete="address-line1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr-l2">Address line 2</Label>
                      <Input id="addr-l2" value={formData.address_line2 || ''} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} placeholder="Landmark (optional)" autoComplete="address-line2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addr-pin">Pincode *</Label>
                        <div className="relative">
                          <Input id="addr-pin" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} />
                          {pincodeLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" aria-hidden />}
                          {pincodeData && !pincodeLoading && <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-success" aria-label="Pincode verified" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addr-country">Country</Label>
                        <Input id="addr-country" value={formData.country} disabled />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addr-city">City *</Label>
                        <Input id="addr-city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} autoComplete="address-level2" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addr-state">State *</Label>
                        <Input id="addr-state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} autoComplete="address-level1" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input type="checkbox" id="is_default" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="rounded" />
                      <Label htmlFor="is_default" className="text-sm cursor-pointer">Set as default address</Label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>Cancel</Button>
                      <Button className="flex-1" onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />}
                        Save address
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
            </div>
          ) : addresses.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-muted-foreground" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold mb-2">No addresses yet</h2>
              <p className="text-muted-foreground mb-6">Add your first delivery address to get started</p>
              <Button className="gap-2" onClick={handleOpenAdd}><Plus className="w-4 h-4" aria-hidden /> Add address</Button>
            </motion.div>
          ) : (
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              className="space-y-4 list-none p-0"
            >
              <AnimatePresence mode="popLayout">
                {addresses.map((address) => {
                  const LabelIcon = getLabelIcon(address.label);
                  return (
                    <motion.li
                      key={address.id}
                      layout
                      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } } }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <Card className={`glass ${address.is_default ? 'ring-2 ring-accent' : ''}`}>
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-4 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                                <LabelIcon className="w-6 h-6 text-accent" aria-hidden />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="font-semibold">{address.label}</p>
                                  {address.is_default && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">Default</span>}
                                </div>
                                <p className="font-medium text-sm">{address.full_name}</p>
                                <p className="text-sm text-muted-foreground mt-1 break-words">
                                  {address.address_line1}{address.address_line2 && `, ${address.address_line2}`}
                                </p>
                                <p className="text-sm text-muted-foreground">{address.city}, {address.state} - {address.pincode}</p>
                                <p className="text-sm text-muted-foreground mt-1">Phone: {address.phone}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(address)} aria-label={`Edit address: ${address.label}`} className="min-h-11 min-w-11">
                                <Edit2 className="w-4 h-4" aria-hidden />
                              </Button>
                              {!address.is_default && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleSetDefault(address.id)} aria-label={`Set ${address.label} as default address`} className="min-h-11 min-w-11">
                                    <Star className="w-4 h-4" aria-hidden />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive min-h-11 min-w-11" aria-label={`Delete address: ${address.label}`}>
                                        <Trash2 className="w-4 h-4" aria-hidden />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this address?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          "{address.label}" — {address.address_line1}, {address.city}. This cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(address.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
