import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Loads the saved color palette from system_settings and applies it to :root CSS variables.
 * Runs once on mount. Renders nothing.
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
          Object.entries(data.value as Record<string, string>).forEach(([key, value]) => {
            if (key.startsWith('--') && typeof value === 'string') {
              root.style.setProperty(key, value);
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
