import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Percent,
  Edit,
  Save,
  Loader2,
  TrendingUp,
  Store,
  DollarSign,
} from 'lucide-react';

export function VendorCommissionManager() {
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [newRate, setNewRate] = useState('');
  const queryClient = useQueryClient();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['admin-vendors-commission'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, brand_name, commission_rate, balance, pending_balance, is_active, is_verified')
        .order('brand_name');
      if (error) throw error;
      return data || [];
    },
  });

  const updateCommission = useMutation({
    mutationFn: async ({ vendorId, rate }: { vendorId: string; rate: number }) => {
      const { error } = await supabase
        .from('vendors')
        .update({ commission_rate: rate })
        .eq('id', vendorId);
      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_log').insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'update_commission_rate',
        entity_type: 'vendor',
        entity_id: vendorId,
        new_values: { commission_rate: rate },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors-commission'] });
      toast.success('Commission rate updated');
      setEditingVendor(null);
      setNewRate('');
    },
    onError: () => toast.error('Failed to update commission rate'),
  });

  const avgRate = vendors?.length
    ? (vendors.reduce((s, v) => s + v.commission_rate, 0) / vendors.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Percent className="w-6 h-6 text-accent" />
          Commission Management
        </h2>
        <p className="text-muted-foreground text-sm">Configure commission rates per vendor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-lg font-bold">{vendors?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-lg font-bold">{avgRate}%</p>
                <p className="text-xs text-muted-foreground">Avg Commission Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  ₹{(vendors?.reduce((s, v) => s + v.pending_balance, 0) || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Vendor Commission Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors?.map(vendor => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.brand_name}</TableCell>
                    <TableCell>
                      <Badge variant={vendor.is_active && vendor.is_verified ? 'default' : 'secondary'}>
                        {vendor.is_active && vendor.is_verified ? 'Active' : vendor.is_verified ? 'Inactive' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {vendor.commission_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell>₹{vendor.balance.toLocaleString()}</TableCell>
                    <TableCell>₹{vendor.pending_balance.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setEditingVendor(vendor);
                          setNewRate(String(vendor.commission_rate));
                        }}
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingVendor} onOpenChange={() => { setEditingVendor(null); setNewRate(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission Rate - {editingVendor?.brand_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Rate</Label>
              <p className="text-2xl font-bold">{editingVendor?.commission_rate}%</p>
            </div>
            <div>
              <Label>New Commission Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
                placeholder="e.g., 15"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Platform will retain this percentage from each sale
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingVendor(null); setNewRate(''); }}>Cancel</Button>
            <Button
              onClick={() => editingVendor && updateCommission.mutate({
                vendorId: editingVendor.id,
                rate: parseFloat(newRate),
              })}
              disabled={updateCommission.isPending || !newRate || parseFloat(newRate) < 0}
              className="gap-2"
            >
              {updateCommission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
