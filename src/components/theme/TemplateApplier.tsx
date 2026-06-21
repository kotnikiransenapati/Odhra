import { useEffect } from 'react';
import { useSiteTemplate } from '@/hooks/useSiteTemplate';

/**
 * Applies the active site template as a data attribute on <html>
 * so global CSS / scoped Tailwind variants can target it:
 *   html[data-template="food"] { ... }
 */
export function TemplateApplier() {
  const { template } = useSiteTemplate();
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-template', template);
    return () => {
      // leave the last value in place; intentional no-op
    };
  }, [template]);
  return null;
}
