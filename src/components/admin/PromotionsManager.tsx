import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Percent,
  Calendar,
  Copy,
  Zap,
  RefreshCw,
  Wand2,
} from 'lucide-react';

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  type: 'coupon' | 'flash_sale' | 'spin_wheel' | 'bundle' | 'buy_x_get_y';
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  usage_count: number | null;
  usage_limit: number | null;
}

export function PromotionsManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [codeGeneratorOpen, setCodeGeneratorOpen] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [codePrefix, setCodePrefix] = useState('ODHRA');
  const [codeCount, setCodeCount] = useState(5);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'coupon' as Promotion['type'],
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 0,
    max_discount_amount: 0,
    starts_at: new Date().toISOString().split('T')[0],
    ends_at: '',
    usage_limit: 0,
  });

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async (): Promise<Promotion[]> => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createPromotion = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('promotions').insert({
        name: data.name,
        code: data.code || null,
        type: data.type,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_amount: data.min_order_amount || null,
        max_discount_amount: data.max_discount_amount || null,
        starts_at: data.starts_at,
        ends_at: data.ends_at || null,
        usage_limit: data.usage_limit || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      toast.success('Promotion created');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error('Failed to create promotion'),
  });

  const updatePromotion = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from('promotions')
        .update({
          name: data.name,
          code: data.code || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_order_amount: data.min_order_amount || null,
          max_discount_amount: data.max_discount_amount || null,
          ends_at: data.ends_at || null,
          usage_limit: data.usage_limit || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      toast.success('Promotion updated');
      setIsDialogOpen(false);
      setEditingPromotion(null);
      resetForm();
    },
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      toast.success('Promotion deleted');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      toast.success('Promotion updated');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'coupon',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 0,
      max_discount_amount: 0,
      starts_at: new Date().toISOString().split('T')[0],
      ends_at: '',
      usage_limit: 0,
    });
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      name: promo.name,
      code: promo.code || '',
      type: promo.type,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_order_amount: promo.min_order_amount || 0,
      max_discount_amount: promo.max_discount_amount || 0,
      starts_at: promo.starts_at.split('T')[0],
      ends_at: promo.ends_at?.split('T')[0] || '',
      usage_limit: promo.usage_limit || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPromotion) {
      updatePromotion.mutate({ id: editingPromotion.id, ...formData });
    } else {
      createPromotion.mutate(formData);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const getTypeColor = (type: Promotion['type']) => {
    switch (type) {
      case 'coupon': return 'bg-info/10 text-info border-info/20';
      case 'flash_sale': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'spin_wheel': return 'bg-accent/10 text-accent border-accent/20';
      case 'bundle': return 'bg-success/10 text-success border-success/20';
      case 'buy_x_get_y': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCodes = () => {
    const newCodes: string[] = [];
    for (let i = 0; i < codeCount; i++) {
      const suffix = generateRandomCode().slice(0, 6);
      newCodes.push(`${codePrefix}${suffix}`);
    }
    setGeneratedCodes(newCodes);
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    toast.success('All codes copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Promotions Manager</h2>
          <p className="text-muted-foreground">Create and manage coupons, flash sales, and offers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCodeGeneratorOpen(true)} className="gap-2">
            <Wand2 className="w-4 h-4" />
            Code Generator
          </Button>
          <Button onClick={() => { resetForm(); setEditingPromotion(null); setIsDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Promotion
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Promotions', value: promotions?.length || 0, icon: Tags },
          { label: 'Active', value: promotions?.filter(p => p.is_active).length || 0, icon: Zap },
          { label: 'Coupons', value: promotions?.filter(p => p.type === 'coupon').length || 0, icon: Percent },
          { label: 'Flash Sales', value: promotions?.filter(p => p.type === 'flash_sale').length || 0, icon: Zap },
        ].map((stat, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promotions Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            All Promotions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions?.map((promo, index) => (
                  <motion.tr
                    key={promo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{promo.name}</p>
                        <p className="text-xs text-muted-foreground">{promo.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(promo.type)}>
                        {promo.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {promo.discount_type === 'percentage' ? (
                          <>{promo.discount_value}%</>
                        ) : (
                          <>₹{promo.discount_value}</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {promo.code ? (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-secondary rounded text-sm">{promo.code}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(promo.code!)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {promo.usage_count || 0}
                        {promo.usage_limit && <span className="text-muted-foreground"> / {promo.usage_limit}</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={promo.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: promo.id, isActive: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deletePromotion.mutate(promo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromotion ? 'Edit Promotion' : 'Create Promotion'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: Promotion['type']) => setFormData({ ...formData, type: value })}
                  disabled={!!editingPromotion}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coupon">Coupon</SelectItem>
                    <SelectItem value="flash_sale">Flash Sale</SelectItem>
                    <SelectItem value="spin_wheel">Spin Wheel</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Code (optional)</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Order Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Discount (₹)</Label>
                <Input
                  type="number"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Usage Limit (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingPromotion ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Generator Dialog */}
      <Dialog open={codeGeneratorOpen} onOpenChange={setCodeGeneratorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Coupon Code Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prefix</Label>
                <Input
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  placeholder="ODHRA"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Count</Label>
                <Input
                  type="number"
                  value={codeCount}
                  onChange={(e) => setCodeCount(Math.min(50, parseInt(e.target.value) || 1))}
                  min={1}
                  max={50}
                />
              </div>
            </div>
            <Button onClick={handleGenerateCodes} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Generate Codes
            </Button>
            {generatedCodes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Generated Codes</Label>
                  <Button variant="ghost" size="sm" onClick={copyAllCodes} className="gap-1 h-7">
                    <Copy className="w-3 h-3" />
                    Copy All
                  </Button>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {generatedCodes.map((code, i) => (
                      <div
                        key={i}
                        className="bg-background px-3 py-2 rounded text-sm font-mono cursor-pointer hover:bg-accent/10 transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          toast.success(`Copied: ${code}`);
                        }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click a code to copy, or use "Copy All" to copy all codes. To use a code, create a promotion above with that code.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
