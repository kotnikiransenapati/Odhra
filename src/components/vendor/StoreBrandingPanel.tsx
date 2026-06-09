import React, { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, UploadCloud, ExternalLink, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface VendorBranding {
  id: string;
  slug?: string | null;
  brand_name?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
}

interface Props {
  vendor: VendorBranding;
}

type Slot = 'logo' | 'banner';

const LIMITS: Record<Slot, { maxBytes: number; aspect: string; hint: string }> = {
  logo: { maxBytes: 2 * 1024 * 1024, aspect: 'aspect-square', hint: 'Square PNG/JPG · 200×200px · max 2MB' },
  banner: { maxBytes: 5 * 1024 * 1024, aspect: 'aspect-[4/1]', hint: 'Wide PNG/JPG · 1200×300px · max 5MB' },
};

async function readImageDimensions(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.width, h: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export const StoreBrandingPanel: React.FC<Props> = ({ vendor }) => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<Slot, number>>({ logo: 0, banner: 0 });
  const [busy, setBusy] = useState<Record<Slot, boolean>>({ logo: false, banner: false });
  const [dragging, setDragging] = useState<Slot | null>(null);

  const logoInput = useRef<HTMLInputElement | null>(null);
  const bannerInput = useRef<HTMLInputElement | null>(null);

  const handleUpload = useCallback(
    async (slot: Slot, file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file');
        return;
      }
      const { maxBytes } = LIMITS[slot];
      if (file.size > maxBytes) {
        toast.error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB`);
        return;
      }

      const dims = await readImageDimensions(file);
      if (dims) {
        if (slot === 'logo' && Math.abs(dims.w - dims.h) / Math.max(dims.w, dims.h) > 0.2) {
          toast.warning('Logo looks non-square — it may be cropped on storefronts.');
        }
        if (slot === 'banner' && dims.w / dims.h < 3) {
          toast.warning('Banner is taller than recommended (4:1). Some areas may crop.');
        }
      }

      setBusy((b) => ({ ...b, [slot]: true }));
      setProgress((p) => ({ ...p, [slot]: 10 }));

      try {
        const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const fileName = `${vendor.id}/${slot}-${Date.now()}.${fileExt}`;

        // Simulated progress (Supabase JS client does not yet expose progress events for storage uploads)
        const tick = setInterval(() => {
          setProgress((p) => ({ ...p, [slot]: Math.min(90, (p[slot] || 0) + 12) }));
        }, 180);

        const { error: uploadError } = await supabase.storage
          .from('vendor-assets')
          .upload(fileName, file, { upsert: true, cacheControl: '3600', contentType: file.type });

        clearInterval(tick);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('vendor-assets').getPublicUrl(fileName);
        setProgress((p) => ({ ...p, [slot]: 95 }));

        const column = slot === 'logo' ? 'logo_url' : 'banner_url';
        const { error: updateError } = await supabase
          .from('vendors')
          .update({ [column]: publicUrl })
          .eq('id', vendor.id);
        if (updateError) throw updateError;

        setProgress((p) => ({ ...p, [slot]: 100 }));
        queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
        toast.success(`${slot === 'logo' ? 'Logo' : 'Banner'} updated`);
      } catch (err: any) {
        toast.error(err?.message || `Failed to upload ${slot}`);
      } finally {
        setTimeout(() => setProgress((p) => ({ ...p, [slot]: 0 })), 600);
        setBusy((b) => ({ ...b, [slot]: false }));
      }
    },
    [vendor.id, queryClient]
  );

  const handleRemove = useCallback(
    async (slot: Slot) => {
      setBusy((b) => ({ ...b, [slot]: true }));
      try {
        const column = slot === 'logo' ? 'logo_url' : 'banner_url';
        const { error } = await supabase.from('vendors').update({ [column]: null }).eq('id', vendor.id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
        toast.success(`${slot === 'logo' ? 'Logo' : 'Banner'} removed`);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to remove image');
      } finally {
        setBusy((b) => ({ ...b, [slot]: false }));
      }
    },
    [vendor.id, queryClient]
  );

  const onDrop = (slot: Slot) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(slot, file);
  };

  const storefrontHref = vendor.slug ? `/store/${vendor.slug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-base">Store Branding</h3>
          <p className="text-sm text-muted-foreground">Polish how your storefront looks to shoppers.</p>
        </div>
        {storefrontHref && (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href={storefrontHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
              View storefront
            </a>
          </Button>
        )}
      </div>

      {/* Logo */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging('logo');
        }}
        onDragLeave={() => setDragging((d) => (d === 'logo' ? null : d))}
        onDrop={onDrop('logo')}
        className={cn(
          'flex items-center gap-6 rounded-xl border border-dashed border-border/60 p-4 transition-colors',
          dragging === 'logo' && 'border-accent bg-accent/5'
        )}
      >
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-accent/20">
            <AvatarImage src={vendor.logo_url || ''} />
            <AvatarFallback className="text-2xl font-bold bg-accent/10 text-accent">
              {vendor.brand_name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            disabled={busy.logo}
            className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-60"
            aria-label="Upload logo"
          >
            {busy.logo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input
            ref={logoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload('logo', e.target.files[0])}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">Store Logo</p>
          <p className="text-xs text-muted-foreground">{LIMITS.logo.hint}</p>
          {progress.logo > 0 && <Progress value={progress.logo} className="mt-2 h-1" />}
          {vendor.logo_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove('logo')}
              disabled={busy.logo}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Banner */}
      <div>
        <Label className="mb-2 block">Store Banner</Label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging('banner');
          }}
          onDragLeave={() => setDragging((d) => (d === 'banner' ? null : d))}
          onDrop={onDrop('banner')}
          className={cn(
            'relative overflow-hidden rounded-xl border border-dashed border-border/60 bg-secondary/30 transition-colors group',
            LIMITS.banner.aspect,
            dragging === 'banner' && 'border-accent bg-accent/5'
          )}
        >
          {vendor.banner_url ? (
            <img src={vendor.banner_url} alt="Store banner" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ImageIcon className="w-8 h-8 opacity-60" />
              <span className="text-sm">Drop an image or click to upload</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => bannerInput.current?.click()}
            disabled={busy.banner}
            className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="flex items-center gap-2 text-background">
              {busy.banner ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
              <span>{vendor.banner_url ? 'Change Banner' : 'Upload Banner'}</span>
            </div>
          </button>
          <input
            ref={bannerInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload('banner', e.target.files[0])}
          />
        </div>
        <div className="flex items-center justify-between mt-2 gap-3">
          <p className="text-xs text-muted-foreground">{LIMITS.banner.hint}</p>
          {vendor.banner_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove('banner')}
              disabled={busy.banner}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
        {progress.banner > 0 && <Progress value={progress.banner} className="mt-2 h-1" />}
      </div>
    </div>
  );
};

export default StoreBrandingPanel;
