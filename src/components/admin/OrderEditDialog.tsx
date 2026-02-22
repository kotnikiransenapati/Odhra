import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Edit3, MapPin, StickyNote, DollarSign, Loader2, Plus, Clock, User, AlertTriangle, Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OrderEditDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderEditDialog({ order, open, onOpenChange }: OrderEditDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('address');

  // Address fields
  const shippingAddr = order?.shipping_address || {};
  const [addressForm, setAddressForm] = useState({
    name: shippingAddr.name || shippingAddr.full_name || '',
    phone: shippingAddr.phone || '',
    address: shippingAddr.address || shippingAddr.address_line1 || '',
    address2: shippingAddr.address_line2 || '',
    city: shippingAddr.city || '',
    state: shippingAddr.state || '',
    pincode: shippingAddr.pincode || '',
    country: shippingAddr.country || 'India',
  });

  // Adjustment fields
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'discount' | 'surcharge'>('discount');

  // Notes
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('internal');

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ['order-notes', order?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_notes')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id && open,
  });

  // Update address
  const updateAddress = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('orders')
        .update({
          shipping_address: {
            full_name: addressForm.name,
            name: addressForm.name,
            phone: addressForm.phone,
            address: addressForm.address,
            address_line1: addressForm.address,
            address_line2: addressForm.address2,
            city: addressForm.city,
            state: addressForm.state,
            pincode: addressForm.pincode,
            country: addressForm.country,
          },
        })
        .eq('id', order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Shipping address updated');
    },
    onError: () => toast.error('Failed to update address'),
  });

  // Add adjustment
  const addAdjustment = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(adjustmentAmount);
      if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

      const adjustedDiscount = adjustmentType === 'discount'
        ? (order.discount_amount || 0) + amount
        : (order.discount_amount || 0) - amount;

      const newTotal = order.subtotal + (order.shipping_amount || 0) + (order.tax_amount || 0) - adjustedDiscount;

      const { error } = await supabase
        .from('orders')
        .update({
          discount_amount: Math.max(0, adjustedDiscount),
          total_amount: Math.max(0, newTotal),
        })
        .eq('id', order.id);
      if (error) throw error;

      // Log as note
      await supabase.from('order_notes').insert({
        order_id: order.id,
        note: `${adjustmentType === 'discount' ? 'Discount' : 'Surcharge'} of ₹${amount.toFixed(2)} applied. Reason: ${adjustmentReason}`,
        note_type: 'adjustment',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-notes', order.id] });
      setAdjustmentAmount('');
      setAdjustmentReason('');
      toast.success('Price adjustment applied');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to apply adjustment'),
  });

  // Add note
  const addNote = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) throw new Error('Note cannot be empty');
      const { error } = await supabase.from('order_notes').insert({
        order_id: order.id,
        note: newNote.trim(),
        note_type: noteType,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-notes', order.id] });
      setNewNote('');
      toast.success('Note added');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add note'),
  });

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Edit Order {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="address" className="gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5" /> Address
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5" /> Adjustments
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs">
              <StickyNote className="w-3.5 h-3.5" /> Notes ({notes.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[60vh] mt-4">
            {/* Address Tab */}
            <TabsContent value="address" className="space-y-4 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Full Name</Label>
                  <Input value={addressForm.name} onChange={e => setAddressForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={addressForm.phone} onChange={e => setAddressForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input value={addressForm.pincode} onChange={e => setAddressForm(p => ({ ...p, pincode: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Address Line 1</Label>
                  <Input value={addressForm.address} onChange={e => setAddressForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Address Line 2</Label>
                  <Input value={addressForm.address2} onChange={e => setAddressForm(p => ({ ...p, address2: e.target.value }))} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={addressForm.city} onChange={e => setAddressForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={addressForm.state} onChange={e => setAddressForm(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={addressForm.country} onChange={e => setAddressForm(p => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              <Button onClick={() => updateAddress.mutate()} disabled={updateAddress.isPending} className="w-full gap-2">
                {updateAddress.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Address
              </Button>
            </TabsContent>

            {/* Adjustments Tab */}
            <TabsContent value="adjustments" className="space-y-4 pr-2">
              <Card>
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                  {order.shipping_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatPrice(order.shipping_amount)}</span></div>}
                  {order.tax_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPrice(order.tax_amount)}</span></div>}
                  {order.discount_amount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(order.discount_amount)}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatPrice(order.total_amount)}</span></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Apply Adjustment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Select value={adjustmentType} onValueChange={(v: 'discount' | 'surcharge') => setAdjustmentType(v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="surcharge">Surcharge</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Amount (₹)" value={adjustmentAmount} onChange={e => setAdjustmentAmount(e.target.value)} />
                  </div>
                  <Textarea placeholder="Reason for adjustment..." value={adjustmentReason} onChange={e => setAdjustmentReason(e.target.value)} rows={2} />
                  <Button onClick={() => addAdjustment.mutate()} disabled={addAdjustment.isPending || !adjustmentAmount || !adjustmentReason} className="w-full gap-2" variant="outline">
                    {addAdjustment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                    Apply {adjustmentType === 'discount' ? 'Discount' : 'Surcharge'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 pr-2">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Select value={noteType} onValueChange={setNoteType}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} className="flex-1" />
                  </div>
                  <Button onClick={() => addNote.mutate()} disabled={addNote.isPending || !newNote.trim()} className="w-full gap-2" variant="outline">
                    {addNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {notes.map((note: any) => (
                  <Card key={note.id} className="border-l-4" style={{
                    borderLeftColor: note.note_type === 'customer' ? 'hsl(var(--info))' : note.note_type === 'adjustment' ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))',
                  }}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{note.note_type}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(note.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{note.note}</p>
                    </CardContent>
                  </Card>
                ))}
                {notes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
