import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Gift,
  Loader2,
  Palette,
  Percent,
  Target,
  Sparkles,
  RotateCcw,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';

interface SpinWheelPrize {
  id: string;
  label: string;
  discount: number;
  probability: number;
  color: string;
}

export function SpinWheelManager() {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(true);
  const [prizes, setPrizes] = useState<SpinWheelPrize[]>([
    { id: '1', label: '5% OFF', discount: 5, probability: 25, color: '#8B5CF6' },
    { id: '2', label: '10% OFF', discount: 10, probability: 20, color: '#F97316' },
    { id: '3', label: '15% OFF', discount: 15, probability: 15, color: '#22C55E' },
    { id: '4', label: '20% OFF', discount: 20, probability: 10, color: '#EC4899' },
    { id: '5', label: 'Free Shipping', discount: 0, probability: 15, color: '#3B82F6' },
    { id: '6', label: 'Try Again', discount: 0, probability: 15, color: '#6B7280' },
  ]);
  const [newPrize, setNewPrize] = useState({ label: '', discount: 0, probability: 10, color: '#8B5CF6' });

  const { data: spinWheelPromos, isLoading } = useQuery({
    queryKey: ['admin-spinwheel-promos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('type', 'spin_wheel')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);

  const addPrize = () => {
    if (!newPrize.label) {
      toast.error('Please enter a prize label');
      return;
    }
    setPrizes([...prizes, { ...newPrize, id: Date.now().toString() }]);
    setNewPrize({ label: '', discount: 0, probability: 10, color: '#8B5CF6' });
    toast.success('Prize added');
  };

  const removePrize = (id: string) => {
    setPrizes(prizes.filter(p => p.id !== id));
    toast.success('Prize removed');
  };

  const updatePrize = (id: string, updates: Partial<SpinWheelPrize>) => {
    setPrizes(prizes.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleSave = async () => {
    if (totalProbability !== 100) {
      toast.error('Total probability must equal 100%');
      return;
    }
    // Save to database logic would go here
    toast.success('Spin wheel configuration saved');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Spin Wheel Manager</h2>
          <p className="text-muted-foreground">Configure the spin-to-win wheel prizes and probabilities</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Save Configuration
        </Button>
      </div>

      {/* Status & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wheel Status</p>
                <p className="text-2xl font-bold">{isEnabled ? 'Active' : 'Disabled'}</p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{prizes.length}</p>
                <p className="text-xs text-muted-foreground">Total Prizes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{spinWheelPromos?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Codes Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`glass ${totalProbability !== 100 ? 'border-destructive' : 'border-green-500/50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalProbability !== 100 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                <Percent className={`w-5 h-5 ${totalProbability !== 100 ? 'text-destructive' : 'text-green-500'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProbability}%</p>
                <p className="text-xs text-muted-foreground">Total Probability</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wheel Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Wheel Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-square max-w-[300px] mx-auto relative">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {prizes.map((prize, index) => {
                  const startAngle = prizes.slice(0, index).reduce((sum, p) => sum + (p.probability / 100) * 360, 0);
                  const endAngle = startAngle + (prize.probability / 100) * 360;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const largeArc = prize.probability > 50 ? 1 : 0;
                  
                  const x1 = 50 + 45 * Math.cos(startRad);
                  const y1 = 50 + 45 * Math.sin(startRad);
                  const x2 = 50 + 45 * Math.cos(endRad);
                  const y2 = 50 + 45 * Math.sin(endRad);
                  
                  return (
                    <path
                      key={prize.id}
                      d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={prize.color}
                      stroke="white"
                      strokeWidth="0.5"
                    />
                  );
                })}
                <circle cx="50" cy="50" r="8" fill="white" />
              </svg>
              <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[15px] border-r-foreground" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {prizes.map((prize) => (
                <div key={prize.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prize.color }} />
                  <span className="text-xs">{prize.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prize Configuration */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Prize Configuration
            </CardTitle>
            <CardDescription>
              Configure prizes and their winning probabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prizes.map((prize) => (
              <motion.div
                key={prize.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border"
              >
                <input
                  type="color"
                  value={prize.color}
                  onChange={(e) => updatePrize(prize.id, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  value={prize.label}
                  onChange={(e) => updatePrize(prize.id, { label: e.target.value })}
                  className="flex-1 h-8"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={prize.probability}
                    onChange={(e) => updatePrize(prize.id, { probability: parseInt(e.target.value) || 0 })}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removePrize(prize.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}

            {/* Add New Prize */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border">
              <input
                type="color"
                value={newPrize.color}
                onChange={(e) => setNewPrize({ ...newPrize, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={newPrize.label}
                onChange={(e) => setNewPrize({ ...newPrize, label: e.target.value })}
                placeholder="Prize label"
                className="flex-1 h-8"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newPrize.probability}
                  onChange={(e) => setNewPrize({ ...newPrize, probability: parseInt(e.target.value) || 0 })}
                  className="w-16 h-8 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button size="icon" className="h-8 w-8" onClick={addPrize}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {totalProbability !== 100 && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <span>⚠️</span>
                Total probability must equal 100% (currently {totalProbability}%)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Spin Wheel Codes */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Generated Spin Wheel Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {spinWheelPromos && spinWheelPromos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spinWheelPromos.slice(0, 10).map((promo: any) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <code className="px-2 py-1 bg-secondary rounded text-sm">{promo.code}</code>
                    </TableCell>
                    <TableCell>
                      {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                        {promo.is_active ? 'Active' : 'Used'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(promo.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No spin wheel codes generated yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
