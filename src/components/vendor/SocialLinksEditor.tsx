import React, { useMemo } from 'react';
import { Globe, Instagram, Facebook, Twitter, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { normalizeSocialLink, type SocialPlatform } from '@/lib/socialLinkValidation';

export interface SocialLinksState {
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
}

interface Props {
  value: SocialLinksState;
  onChange: (next: SocialLinksState) => void;
  onValidityChange?: (isValid: boolean) => void;
}

const FIELDS: Array<{
  key: SocialPlatform;
  label: string;
  placeholder: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'website', label: 'Website', placeholder: 'https://yourstore.com', Icon: Globe },
  { key: 'instagram', label: 'Instagram', placeholder: '@yourhandle or full URL', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', placeholder: '@yourpage or full URL', Icon: Facebook },
  { key: 'twitter', label: 'X / Twitter', placeholder: '@yourhandle or full URL', Icon: Twitter },
];

export const SocialLinksEditor: React.FC<Props> = ({ value, onChange, onValidityChange }) => {
  const verdicts = useMemo(() => {
    const v = {} as Record<SocialPlatform, ReturnType<typeof normalizeSocialLink>>;
    FIELDS.forEach((f) => (v[f.key] = normalizeSocialLink(f.key, value[f.key] || '')));
    return v;
  }, [value]);

  React.useEffect(() => {
    const ok = FIELDS.every((f) => verdicts[f.key].ok);
    onValidityChange?.(ok);
  }, [verdicts, onValidityChange]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map(({ key, label, placeholder, Icon }) => {
        const raw = value[key] || '';
        const v = verdicts[key];
        const showState = raw.length > 0;
        return (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`social-${key}`} className="flex items-center gap-2 text-sm">
              <Icon className="w-4 h-4 text-muted-foreground" />
              {label}
            </Label>
            <div className="relative">
              <Input
                id={`social-${key}`}
                value={raw}
                placeholder={placeholder}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                className={cn(
                  'pr-9',
                  showState && !v.ok && 'border-destructive focus-visible:ring-destructive',
                  showState && v.ok && 'border-emerald-500/40'
                )}
                aria-invalid={showState && !v.ok}
                aria-describedby={`social-${key}-msg`}
              />
              {showState && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  {v.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                </span>
              )}
            </div>
            <p
              id={`social-${key}-msg`}
              className={cn(
                'text-xs min-h-[1rem]',
                showState && !v.ok ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {showState && !v.ok && v.error}
              {showState && v.ok && v.value && (
                <a
                  href={v.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-accent"
                >
                  <ExternalLink className="w-3 h-3" />
                  {v.value.replace(/^https?:\/\//, '')}
                </a>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default SocialLinksEditor;
