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

/**
 * Psychology-driven color palettes:
 * Each palette uses color theory + consumer psychology for optimal conversions.
 * - Primary: brand identity & trust (60% of UI)
 * - Accent: CTAs & action triggers (10% of UI, high contrast)
 * - Success/Destructive/Warning/Info: universal feedback signals
 * - Background/Foreground/Card/Muted/Secondary: hierarchy & readability
 */
const presets: Preset[] = [
  {
    name: 'Trust Blue & Warm Orange',
    description: 'Reliability meets urgency — ideal for mainstream e-commerce',
    colors: {
      '--primary': '220 65% 28%',
      '--accent': '24 95% 53%',
      '--success': '152 60% 38%',
      '--destructive': '0 72% 51%',
      '--warning': '45 93% 47%',
      '--info': '205 85% 50%',
      '--background': '220 20% 98%',
      '--foreground': '220 40% 10%',
      '--secondary': '220 14% 95%',
      '--card': '220 20% 100%',
      '--muted': '220 10% 92%',
    },
  },
  {
    name: 'Emerald & Charcoal',
    description: 'Growth, health & sophistication — great for wellness & organic brands',
    colors: {
      '--primary': '160 50% 22%',
      '--accent': '160 65% 42%',
      '--success': '145 58% 40%',
      '--destructive': '0 68% 50%',
      '--warning': '40 90% 50%',
      '--info': '200 78% 48%',
      '--background': '150 12% 98%',
      '--foreground': '160 35% 8%',
      '--secondary': '155 10% 95%',
      '--card': '150 15% 100%',
      '--muted': '155 8% 91%',
    },
  },
  {
    name: 'Royal Indigo & Gold',
    description: 'Premium authority & luxury — signals exclusivity & high value',
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
    name: 'Midnight & Rose',
    description: 'Bold elegance & femininity — fashion, beauty & lifestyle',
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
  {
    name: 'Slate & Crimson',
    description: 'Modern power & decisiveness — tech, electronics & sports',
    colors: {
      '--primary': '215 25% 20%',
      '--accent': '0 80% 52%',
      '--success': '155 55% 38%',
      '--destructive': '0 72% 51%',
      '--warning': '42 90% 50%',
      '--info': '210 80% 52%',
      '--background': '210 15% 98%',
      '--foreground': '215 30% 10%',
      '--secondary': '210 10% 95%',
      '--card': '210 15% 100%',
      '--muted': '210 8% 91%',
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

  /** Build a full palette including derived variables so ThemeApplier covers everything */
  const buildFullPalette = (base: Record<string, string>): Record<string, string> => {
    const full = { ...base };
    // Derive foreground variants (keep existing if set)
    if (base['--primary']) {
      full['--ring'] = base['--primary'];
      full['--chart-1'] = base['--primary'];
    }
    if (base['--accent']) {
      full['--sidebar-primary'] = base['--accent'];
      full['--sidebar-ring'] = base['--accent'];
      full['--premium'] = base['--accent'];
      full['--chart-2'] = base['--accent'];
    }
    if (base['--destructive']) {
      full['--urgency'] = base['--destructive'];
    }
    if (base['--success']) {
      full['--growth'] = base['--success'];
      full['--chart-3'] = base['--success'];
    }
    if (base['--info']) {
      full['--trust'] = base['--info'];
      full['--chart-4'] = base['--info'];
    }
    return full;
  };

  const handleSave = async () => {
    try {
      const fullPalette = buildFullPalette(colors);
      await updateSetting.mutateAsync({ key: 'color_palette', value: fullPalette, category: 'appearance', description: 'Custom color palette for the marketplace' });
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
