import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings2, 
  ToggleLeft, 
  ToggleRight, 
  Search,
  Sparkles,
  Shield,
  TrendingUp,
  Package,
  Users,
  Bell,
  Loader2,
  ChevronDown,
  Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useFeatureFlags, useUpdateFeatureFlag, FeatureFlag } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';

const categoryIcons: Record<string, React.ReactNode> = {
  marketing: <TrendingUp className="w-4 h-4" />,
  search: <Search className="w-4 h-4" />,
  engagement: <Sparkles className="w-4 h-4" />,
  products: <Package className="w-4 h-4" />,
  vendors: <Users className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  system: <Settings2 className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  marketing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  search: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  engagement: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  products: 'bg-green-500/10 text-green-500 border-green-500/20',
  vendors: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  security: 'bg-red-500/10 text-red-500 border-red-500/20',
  system: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

interface FeatureFlagItemProps {
  flag: FeatureFlag;
  onToggle: (id: string, enabled: boolean) => void;
  onUpdateSettings: (id: string, settings: Record<string, any>) => void;
  isUpdating: boolean;
}

function FeatureFlagItem({ flag, onToggle, onUpdateSettings, isUpdating }: FeatureFlagItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(flag.settings);
  const hasSettings = Object.keys(flag.settings).length > 0;

  const handleSaveSettings = () => {
    onUpdateSettings(flag.id, localSettings);
  };

  return (
    <motion.div
      layout
      className={`p-4 rounded-xl border transition-all ${
        flag.is_enabled 
          ? 'bg-card border-accent/30' 
          : 'bg-muted/30 border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{flag.feature_name}</h4>
            <Badge 
              variant="outline" 
              className={`text-xs capitalize ${categoryColors[flag.category] || ''}`}
            >
              {categoryIcons[flag.category]}
              <span className="ml-1">{flag.category}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{flag.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={flag.is_enabled}
            onCheckedChange={(checked) => onToggle(flag.id, checked)}
            disabled={isUpdating}
          />
        </div>
      </div>

      {/* Settings Panel */}
      {hasSettings && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-3 gap-2">
              <Settings2 className="w-4 h-4" />
              Configure Settings
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-4">
              {Object.entries(flag.settings).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`${flag.id}-${key}`} className="text-sm capitalize">
                    {key.replace(/_/g, ' ')}
                  </Label>
                  {typeof value === 'boolean' ? (
                    <Switch
                      id={`${flag.id}-${key}`}
                      checked={localSettings[key] as boolean}
                      onCheckedChange={(checked) => 
                        setLocalSettings(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  ) : typeof value === 'number' ? (
                    <Input
                      id={`${flag.id}-${key}`}
                      type="number"
                      value={localSettings[key] as number}
                      onChange={(e) => 
                        setLocalSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                      className="max-w-[200px]"
                    />
                  ) : (
                    <Input
                      id={`${flag.id}-${key}`}
                      type="text"
                      value={localSettings[key] as string}
                      onChange={(e) => 
                        setLocalSettings(prev => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
              <Button 
                size="sm" 
                onClick={handleSaveSettings}
                disabled={isUpdating}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </motion.div>
  );
}

export function FeatureFlagsManager() {
  const { flags, isLoading } = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(flags.map(f => f.category))];

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          flag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || flag.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await updateFlag.mutateAsync({ id, is_enabled: enabled });
      toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update feature');
    }
  };

  const handleUpdateSettings = async (id: string, settings: Record<string, any>) => {
    try {
      await updateFlag.mutateAsync({ id, settings });
      toast.success('Settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Feature Management</h2>
        <p className="text-muted-foreground">
          Control which features are enabled across your store
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="gap-1.5 capitalize"
                >
                  {categoryIcons[cat]}
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">
              {flags.filter(f => f.is_enabled).length}
            </p>
            <p className="text-sm text-muted-foreground">Enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {flags.filter(f => !f.is_enabled).length}
            </p>
            <p className="text-sm text-muted-foreground">Disabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{flags.length}</p>
            <p className="text-sm text-muted-foreground">Total Features</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{categories.length}</p>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature List */}
      <div className="space-y-3">
        {filteredFlags.map((flag) => (
          <FeatureFlagItem
            key={flag.id}
            flag={flag}
            onToggle={handleToggle}
            onUpdateSettings={handleUpdateSettings}
            isUpdating={updateFlag.isPending}
          />
        ))}

        {filteredFlags.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Settings2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No features found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
