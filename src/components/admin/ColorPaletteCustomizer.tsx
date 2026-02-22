import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUpdateSetting, useSystemSettings } from '@/hooks/useAdminSettings';
import {
  Palette,
  Save,
  RefreshCw,
  RotateCcw,
  Eye,
  Sparkles,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

// HSL helpers
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  r = parseInt(hex.substring(0, 2), 16) / 255;
  g = parseInt(hex.substring(2, 4), 16) / 255;
  b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hslStringToHex(hslStr: string): string {
  const parts = hslStr.trim().split(/\s+/).map(Number);
  if (parts.length >= 3) return hslToHex(parts[0], parts[1], parts[2]);
  return '#000000';
}

function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

interface ColorToken {
  key: string;
  label: string;
  description: string;
  category: 'brand' | 'feedback' | 'surface';
}

const colorTokens: ColorToken[] = [
  { key: '--primary', label: 'Primary', description: 'Main brand color for buttons and key elements', category: 'brand' },
  { key: '--accent', label: 'Accent / Gold', description: 'CTA buttons, highlights, premium elements', category: 'brand' },
  { key: '--secondary', label: 'Secondary', description: 'Secondary backgrounds and subtle elements', category: 'surface' },
  { key: '--background', label: 'Background', description: 'Page background color', category: 'surface' },
  { key: '--foreground', label: 'Foreground', description: 'Main text color', category: 'surface' },
  { key: '--card', label: 'Card', description: 'Card and panel backgrounds', category: 'surface' },
  { key: '--muted', label: 'Muted', description: 'Disabled states and subtle backgrounds', category: 'surface' },
  { key: '--success', label: 'Success', description: 'Success states, confirmations, growth', category: 'feedback' },
  { key: '--destructive', label: 'Destructive', description: 'Errors, deletions, urgent warnings', category: 'feedback' },
  { key: '--warning', label: 'Warning', description: 'Caution states and alerts', category: 'feedback' },
  { key: '--info', label: 'Info', description: 'Informational highlights', category: 'feedback' },
];

interface Preset {
  name: string;
  description: string;
  colors: Record<string, string>;
}

const presets: Preset[] = [
  {
    name: 'Royal Indigo & Gold',
    description: 'Premium, authoritative, elegant',
    colors: {
      '--primary': '262 56% 22%',
      '--accent': '42 92% 52%',
      '--success': '158 64% 40%',
      '--destructive': '0 72% 51%',
      '--warning': '38 92% 50%',
      '--info': '217 91% 50%',
      '--background': '250 20% 98%',
      '--foreground': '260 45% 11%',
      '--secondary': '250 18% 95%',
      '--card': '250 25% 100%',
      '--muted': '252 14% 92%',
    },
  },
  {
    name: 'Ocean Teal & Coral',
    description: 'Fresh, energetic, modern',
    colors: {
      '--primary': '180 60% 28%',
      '--accent': '16 85% 58%',
      '--success': '145 63% 42%',
      '--destructive': '0 72% 51%',
      '--warning': '38 92% 50%',
      '--info': '200 80% 50%',
      '--background': '180 15% 98%',
      '--foreground': '180 40% 10%',
      '--secondary': '180 12% 95%',
      '--card': '180 15% 100%',
      '--muted': '180 10% 92%',
    },
  },
  {
    name: 'Forest & Amber',
    description: 'Earthy, warm, trustworthy',
    colors: {
      '--primary': '150 45% 20%',
      '--accent': '35 90% 52%',
      '--success': '140 55% 42%',
      '--destructive': '0 70% 50%',
      '--warning': '42 88% 50%',
      '--info': '210 75% 50%',
      '--background': '40 20% 98%',
      '--foreground': '150 35% 10%',
      '--secondary': '40 14% 95%',
      '--card': '40 20% 100%',
      '--muted': '40 10% 92%',
    },
  },
  {
    name: 'Midnight & Rose',
    description: 'Bold, luxurious, dramatic',
    colors: {
      '--primary': '240 45% 16%',
      '--accent': '340 75% 55%',
      '--success': '158 64% 40%',
      '--destructive': '0 72% 51%',
      '--warning': '38 92% 50%',
      '--info': '210 90% 55%',
      '--background': '240 18% 98%',
      '--foreground': '240 40% 10%',
      '--secondary': '240 14% 95%',
      '--card': '240 20% 100%',
      '--muted': '240 10% 92%',
    },
  },
];

export function ColorPaletteCustomizer() {
  const { data: settings } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const [colors, setColors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // Load saved palette from system settings
  useEffect(() => {
    if (settings?.grouped?.color_palette) {
      setColors(settings.grouped.color_palette);
    } else {
      // Read current CSS variables as defaults
      const root = document.documentElement;
      const current: Record<string, string> = {};
      colorTokens.forEach(token => {
        const val = getComputedStyle(root).getPropertyValue(token.key).trim();
        if (val) current[token.key] = val;
      });
      setColors(current);
    }
  }, [settings]);

  const updateColor = (key: string, hex: string) => {
    const hslStr = hexToHslString(hex);
    setColors(prev => ({ ...prev, [key]: hslStr }));
    setHasChanges(true);
  };

  const getHex = (key: string): string => {
    const val = colors[key];
    if (!val) return '#000000';
    return hslStringToHex(val);
  };

  const applyPreview = useCallback(() => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    setPreviewing(true);
  }, [colors]);

  const removePreview = useCallback(() => {
    const root = document.documentElement;
    colorTokens.forEach(token => {
      root.style.removeProperty(token.key);
    });
    setPreviewing(false);
  }, []);

  const applyPreset = (preset: Preset) => {
    setColors(preset.colors);
    setHasChanges(true);
    // Live preview
    const root = document.documentElement;
    Object.entries(preset.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    setPreviewing(true);
    toast.success(`Applied "${preset.name}" palette preview`);
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'color_palette', value: colors, category: 'appearance', description: 'Custom color palette for the marketplace' });
      setHasChanges(false);
      toast.success('Color palette saved! Changes will apply site-wide.');
    } catch {
      toast.error('Failed to save color palette');
    }
  };

  const handleReset = () => {
    removePreview();
    setColors({});
    setHasChanges(false);
    toast.info('Palette reset to defaults');
  };

  const renderColorGroup = (category: ColorToken['category'], title: string) => {
    const tokens = colorTokens.filter(t => t.category === category);
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tokens.map(token => (
            <div key={token.key} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
              <div className="relative mt-1">
                <input
                  type="color"
                  value={getHex(token.key)}
                  onChange={(e) => updateColor(token.key, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border/50 bg-transparent"
                  style={{ padding: 0 }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium">{token.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{token.description}</p>
                <code className="text-[10px] text-muted-foreground/70 mt-1 block font-mono">
                  {colors[token.key] || 'default'}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-accent" />
              Color Palette Customizer
            </CardTitle>
            <CardDescription className="mt-1">
              Change your marketplace's color scheme across all pages instantly
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {previewing && (
              <Badge variant="outline" className="text-info border-info gap-1">
                <Eye className="w-3 h-3" />
                Previewing
              </Badge>
            )}
            {hasChanges && (
              <Badge variant="outline" className="text-warning border-warning gap-1">
                <Sparkles className="w-3 h-3" />
                Unsaved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Preset Palettes */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Presets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {presets.map((preset) => (
              <motion.button
                key={preset.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => applyPreset(preset)}
                className="group relative p-4 rounded-xl border border-border/50 hover:border-accent/50 bg-card hover:shadow-lg transition-all text-left"
              >
                {/* Color preview dots */}
                <div className="flex gap-1.5 mb-3">
                  {['--primary', '--accent', '--success', '--destructive'].map(key => (
                    <div
                      key={key}
                      className="w-6 h-6 rounded-full border border-border/30 shadow-sm"
                      style={{ backgroundColor: hslStringToHex(preset.colors[key] || '0 0% 0%') }}
                    />
                  ))}
                </div>
                <p className="text-sm font-semibold">{preset.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Color Tokens */}
        {renderColorGroup('brand', 'Brand Colors')}
        <Separator />
        {renderColorGroup('feedback', 'Feedback Colors')}
        <Separator />
        {renderColorGroup('surface', 'Surface Colors')}

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={previewing ? removePreview : applyPreview}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              {previewing ? 'Remove Preview' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSetting.isPending}
            className="gap-2 min-w-[140px]"
          >
            {updateSetting.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Palette
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
