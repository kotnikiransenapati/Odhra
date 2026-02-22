import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Mapping from core palette keys to all derived CSS variables that should mirror them.
 * When a core color changes, all its derived variables are updated too.
 */
const derivedMap: Record<string, { variable: string; value?: string }[]> = {
  '--primary': [
    { variable: '--primary-foreground' }, // keep existing
    { variable: '--ring' },
    { variable: '--chart-1' },
  ],
  '--accent': [
    { variable: '--accent-foreground' }, // keep existing
    { variable: '--sidebar-primary' },
    { variable: '--sidebar-ring' },
    { variable: '--sidebar-primary-foreground' }, // keep existing
    { variable: '--premium' },
    { variable: '--chart-2' },
  ],
  '--destructive': [
    { variable: '--urgency' },
  ],
  '--success': [
    { variable: '--growth' },
    { variable: '--chart-3' },
  ],
  '--info': [
    { variable: '--trust' },
    { variable: '--chart-4' },
  ],
  '--warning': [],
};

/**
 * Loads the saved color palette from system_settings and applies it to :root CSS variables.
 * Also propagates derived variables (ring, sidebar, psychology colors, charts) so the
 * entire theme stays consistent with the admin-chosen palette.
 */
export function ThemeApplier() {
  useEffect(() => {
    const loadPalette = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'color_palette')
          .maybeSingle();

        if (data?.value && typeof data.value === 'object') {
          const root = document.documentElement;
          const palette = data.value as Record<string, string>;

          Object.entries(palette).forEach(([key, value]) => {
            if (key.startsWith('--') && typeof value === 'string') {
              // Set the core variable
              root.style.setProperty(key, value);

              // Propagate to derived variables (same HSL value)
              const derived = derivedMap[key];
              if (derived) {
                derived.forEach(d => {
                  root.style.setProperty(d.variable, d.value ?? value);
                });
              }
            }
          });
        }
      } catch {
        // Silently fail - default CSS palette is fine
      }
    };

    loadPalette();
  }, []);

  return null;
}
