import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout, Check, Loader2 } from 'lucide-react';
import { SITE_TEMPLATES, useSiteTemplate, type SiteTemplate } from '@/hooks/useSiteTemplate';
import { useUpdateSetting } from '@/hooks/useAdminSettings';
import { cn } from '@/lib/utils';

export function SiteTemplateSelector() {
  const { template, isLoading } = useSiteTemplate();
  const update = useUpdateSetting();

  const handleSelect = (id: SiteTemplate) => {
    if (id === template) return;
    update.mutate({
      key: 'site_template',
      value: { template: id },
      category: 'appearance',
      description: 'Active site-wide UI template',
    });
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layout className="w-5 h-5" />
          Site Template
        </CardTitle>
        <CardDescription>
          Switch the entire storefront between curated template systems. Affects layout, typography accents and homepage composition.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {SITE_TEMPLATES.map((t) => {
          const active = t.id === template;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t.id)}
              disabled={update.isPending || isLoading}
              className={cn(
                'text-left rounded-xl border p-4 transition-all',
                active
                  ? 'border-accent ring-2 ring-accent/40 bg-accent/5'
                  : 'border-border hover:border-accent/60 hover:bg-secondary/40',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{t.label}</span>
                {active && <Badge variant="default" className="gap-1"><Check className="w-3 h-3" /> Active</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              {active && update.isPending && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                </div>
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
