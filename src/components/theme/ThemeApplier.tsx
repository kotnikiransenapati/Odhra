import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * Loads saved color palettes (light + dark) from system_settings
 * and applies the correct one based on the resolved theme.
 * Falls back to the legacy 'color_palette' key for backward compatibility.
 * Renders nothing.
 */
export function ThemeApplier() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const loadAndApply = async () => {
      try {
        // Fetch all three possible palette keys in one query
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

        // Determine which palette to apply
        let palette: Record<string, string> | undefined;

        if (resolvedTheme === 'dark') {
          palette = palettes['color_palette_dark'];
          // No fallback to light palette for dark mode — let CSS defaults handle it
        } else {
          palette = palettes['color_palette_light'] || palettes['color_palette'];
        }

        if (!palette) return;

        const root = document.documentElement;
        Object.entries(palette).forEach(([key, value]) => {
          if (key.startsWith('--') && typeof value === 'string') {
            root.style.setProperty(key, value);
          }
        });
      } catch {
        // Silently fail - default CSS palette is fine
      }
    };

    // Clear any previously applied inline styles first so theme switch is clean
    const root = document.documentElement;
    const allTokens = [
      '--primary', '--primary-foreground', '--accent', '--accent-foreground',
      '--secondary', '--secondary-foreground', '--background', '--foreground',
      '--card', '--card-foreground', '--muted', '--muted-foreground',
      '--success', '--success-foreground', '--destructive', '--destructive-foreground',
      '--warning', '--warning-foreground', '--info', '--info-foreground',
      '--ring', '--chart-1', '--chart-2', '--chart-3', '--chart-4',
      '--sidebar-primary', '--sidebar-ring', '--premium', '--trust', '--urgency', '--growth',
    ];
    allTokens.forEach(t => root.style.removeProperty(t));

    loadAndApply();
  }, [resolvedTheme]);

  return null;
}
