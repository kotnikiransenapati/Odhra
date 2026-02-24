import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * CSS defaults from index.css (light mode). If DB values match these,
 * we skip applying inline styles to avoid FOUC and cross-browser inconsistency.
 */
const CSS_DEFAULTS_LIGHT: Record<string, string> = {
  '--primary': '240 45% 16%',
  '--primary-foreground': '250 30% 98%',
  '--accent': '340 75% 55%',
  '--accent-foreground': '240 40% 10%',
  '--background': '240 18% 98%',
  '--foreground': '240 40% 10%',
  '--card': '240 20% 100%',
  '--card-foreground': '240 40% 10%',
  '--secondary': '240 14% 95%',
  '--secondary-foreground': '240 40% 10%',
  '--muted': '240 10% 92%',
  '--muted-foreground': '252 12% 46%',
  '--destructive': '0 72% 51%',
  '--destructive-foreground': '0 0% 100%',
  '--success': '158 64% 40%',
  '--success-foreground': '0 0% 100%',
  '--warning': '38 92% 50%',
  '--warning-foreground': '240 40% 10%',
  '--info': '210 90% 55%',
  '--info-foreground': '0 0% 100%',
  '--border': '252 16% 89%',
  '--input': '252 16% 89%',
  '--ring': '240 45% 16%',
  '--chart-1': '240 45% 16%',
  '--chart-2': '340 75% 55%',
  '--chart-3': '158 64% 40%',
  '--chart-4': '210 90% 55%',
  '--sidebar-primary': '340 75% 55%',
  '--sidebar-ring': '340 75% 55%',
  '--premium': '340 75% 55%',
  '--trust': '210 90% 55%',
  '--urgency': '0 72% 51%',
  '--growth': '158 64% 40%',
};

const ALL_TOKENS = [
  '--primary', '--primary-foreground', '--accent', '--accent-foreground',
  '--secondary', '--secondary-foreground', '--background', '--foreground',
  '--card', '--card-foreground', '--popover', '--popover-foreground',
  '--muted', '--muted-foreground',
  '--success', '--success-foreground', '--destructive', '--destructive-foreground',
  '--warning', '--warning-foreground', '--info', '--info-foreground',
  '--border', '--input', '--ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--sidebar-primary', '--sidebar-ring', '--sidebar-background', '--sidebar-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border',
  '--sidebar-primary-foreground',
  '--premium', '--trust', '--urgency', '--growth',
];

function paletteMatchesDefaults(palette: Record<string, string>): boolean {
  return Object.entries(palette).every(([key, value]) => {
    if (!key.startsWith('--')) return true;
    const def = CSS_DEFAULTS_LIGHT[key];
    return def !== undefined && def.trim() === value.trim();
  });
}

/**
 * Loads saved color palettes (light + dark) from system_settings
 * and applies the correct one based on the resolved theme.
 * Skips inline overrides when DB values match CSS defaults to ensure
 * zero-flash, cross-browser consistent rendering.
 */
export function ThemeApplier() {
  const { resolvedTheme } = useTheme();
  const hasAppliedInline = useRef(false);

  useEffect(() => {
    const root = document.documentElement;

    // Clear any previously applied inline styles so theme switch is clean
    if (hasAppliedInline.current) {
      ALL_TOKENS.forEach(t => root.style.removeProperty(t));
      hasAppliedInline.current = false;
    }

    const loadAndApply = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['color_palette', 'color_palette_light', 'color_palette_dark']);

        if (!data || data.length === 0) return;

        const palettes: Record<string, Record<string, string>> = {};
        data.forEach((row: any) => {
          if (row.value && typeof row.value === 'object') {
            palettes[row.key] = row.value as Record<string, string>;
          }
        });

        let palette: Record<string, string> | undefined;
        if (resolvedTheme === 'dark') {
          palette = palettes['color_palette_dark'];
        } else {
          palette = palettes['color_palette_light'] || palettes['color_palette'];
        }

        if (!palette) return;

        // If the palette matches CSS defaults, skip inline styles entirely.
        // This prevents race-condition color flashes across browsers.
        if (resolvedTheme === 'light' && paletteMatchesDefaults(palette)) {
          return;
        }

        Object.entries(palette).forEach(([key, value]) => {
          if (key.startsWith('--') && typeof value === 'string') {
            root.style.setProperty(key, value);
          }
        });
        hasAppliedInline.current = true;
      } catch {
        // Silently fail - default CSS palette is fine
      }
    };

    loadAndApply();
  }, [resolvedTheme]);

  return null;
}
