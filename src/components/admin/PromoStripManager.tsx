import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Timer,
  Link,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useCMSContent, useCreateCMSContent, useUpdateCMSContent, useDeleteCMSContent } from '@/hooks/useCMSContent';

interface PromoStrip {
  id: string;
  message: string;
  link: string;
  linkText: string;
  countdownTo: string | null;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const PRESET_COLORS = [
  { bg: 'from-primary to-primary/80', label: 'Primary' },
  { bg: 'from-destructive to-destructive/80', label: 'Urgent' },
  { bg: 'from-accent to-accent/80', label: 'Accent' },
  { bg: 'from-success to-success/80', label: 'Success' },
  { bg: 'from-info to-info/80', label: 'Info' },
  { bg: 'from-foreground to-foreground/80', label: 'Dark' },
];

export function PromoStripManager() {
  const { data: allContent, isLoading } = useCMSContent('promo_strip');
  const createContent = useCreateCMSContent();
  const updateContent = useUpdateCMSContent();
  const deleteContent = useDeleteCMSContent();

  const [promoStrips, setPromoStrips] = useState<PromoStrip[]>([]);
  const [editingStrip, setEditingStrip] = useState<PromoStrip | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (allContent) {
      const strips = allContent
        .filter(c => c.type === 'promo_strip')
        .map(c => {
          const content = c.content as Record<string, any>;
          return {
            id: c.id,
            message: content.message || '',
            link: content.link || '',
            linkText: content.linkText || 'Shop Now',
            countdownTo: c.ends_at || content.countdownTo || null,
            backgroundColor: content.backgroundColor || 'from-primary to-primary/80',
            textColor: content.textColor || 'primary-foreground',
            isActive: c.is_active,
            startsAt: c.starts_at,
            endsAt: c.ends_at,
          };
        });
      setPromoStrips(strips);
    }
  }, [allContent]);

  const handleAddStrip = () => {
    setEditingStrip({
      id: '',
      message: '🔥 Flash Sale! Get 20% off everything',
      link: '/shop',
      linkText: 'Shop Now',
      countdownTo: null,
      backgroundColor: 'from-primary to-primary/80',
      textColor: 'primary-foreground',
      isActive: true,
      startsAt: null,
      endsAt: null,
    });
    setDialogOpen(true);
  };

  const handleSaveStrip = async (strip: PromoStrip) => {
    setIsSaving(true);
    try {
      const contentData = {
        message: strip.message,
        link: strip.link,
        linkText: strip.linkText,
        countdownTo: strip.countdownTo,
        backgroundColor: strip.backgroundColor,
        textColor: strip.textColor,
      };

      if (strip.id) {
        await updateContent.mutateAsync({
          id: strip.id,
          content: contentData,
          is_active: strip.isActive,
          starts_at: strip.startsAt,
          ends_at: strip.endsAt || strip.countdownTo,
        });
      } else {
        await createContent.mutateAsync({
          slug: `promo-strip-${Date.now()}`,
          type: 'promo_strip',
          title: 'Promo Strip',
          content: contentData,
          is_active: strip.isActive,
          sort_order: promoStrips.length,
          starts_at: strip.startsAt,
          ends_at: strip.endsAt || strip.countdownTo,
        });
      }
      setDialogOpen(false);
      setEditingStrip(null);
      toast.success('Promo strip saved successfully');
    } catch (error) {
      console.error('Failed to save promo strip:', error);
      toast.error('Failed to save promo strip');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStrip = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo strip?')) return;
    
    try {
      await deleteContent.mutateAsync(id);
      toast.success('Promo strip deleted');
    } catch (error) {
      toast.error('Failed to delete promo strip');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateContent.mutateAsync({ id, is_active: isActive });
    } catch (error) {
      toast.error('Failed to update promo strip');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Promo Strip Manager
            </CardTitle>
            <CardDescription>
              Create eye-catching promotional banners that appear at the top of your homepage
            </CardDescription>
          </div>
          <Button onClick={handleAddStrip} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Promo Strip
          </Button>
        </CardHeader>
        <CardContent>
          {promoStrips.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No promo strips yet</p>
              <Button onClick={handleAddStrip} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Promo Strip
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {promoStrips.map((strip, index) => (
                <motion.div
                  key={strip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={`relative overflow-hidden rounded-xl border ${
                    strip.isActive ? 'border-border' : 'border-muted opacity-60'
                  }`}>
                    {/* Preview */}
                    <div className={`bg-gradient-to-r ${strip.backgroundColor} p-4 text-white`}>
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-sm font-medium">{strip.message}</span>
                        {strip.link && (
                          <span className="text-sm font-semibold underline flex items-center gap-1">
                            {strip.linkText}
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                        {strip.countdownTo && (
                          <Badge variant="secondary" className="bg-white/20 text-white border-0">
                            <Timer className="w-3 h-3 mr-1" />
                            Countdown Active
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between p-4 bg-card">
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {strip.startsAt && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                Starts: {new Date(strip.startsAt).toLocaleDateString()}
                              </Badge>
                            )}
                            {strip.endsAt && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Ends: {new Date(strip.endsAt).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                          {strip.link && (
                            <p className="text-xs text-muted-foreground">
                              Links to: {strip.link}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingStrip(strip);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(strip.id, !strip.isActive)}
                        >
                          {strip.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteStrip(strip.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {editingStrip?.id ? 'Edit Promo Strip' : 'Create Promo Strip'}
            </DialogTitle>
          </DialogHeader>

          {editingStrip && (
            <PromoStripForm
              strip={editingStrip}
              onSave={handleSaveStrip}
              onCancel={() => {
                setDialogOpen(false);
                setEditingStrip(null);
              }}
              isSaving={isSaving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromoStripForm({
  strip,
  onSave,
  onCancel,
  isSaving,
}: {
  strip: PromoStrip;
  onSave: (s: PromoStrip) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(strip);
  const [hasCountdown, setHasCountdown] = useState(!!strip.countdownTo);

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div className={`bg-gradient-to-r ${form.backgroundColor} p-3 rounded-lg text-white text-center`}>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="font-medium">{form.message || 'Your message here...'}</span>
            {form.link && (
              <span className="font-semibold underline">{form.linkText}</span>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Message *</Label>
        <Textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="🔥 Flash Sale! Get 20% off everything"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Tip: Use emojis to make your message stand out!
        </p>
      </div>

      {/* Link Settings */}
      <div className="space-y-4 p-4 rounded-lg bg-muted/50">
        <Label className="flex items-center gap-2">
          <Link className="w-4 h-4" />
          Link Settings
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Link URL</Label>
            <Input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/shop or https://..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Link Text</Label>
            <Input
              value={form.linkText}
              onChange={(e) => setForm({ ...form, linkText: e.target.value })}
              placeholder="Shop Now"
            />
          </div>
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-3">
        <Label>Background Style</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.bg}
              type="button"
              onClick={() => setForm({ ...form, backgroundColor: color.bg })}
              className={`h-12 rounded-lg bg-gradient-to-r ${color.bg} transition-all ${
                form.backgroundColor === color.bg 
                  ? 'ring-2 ring-offset-2 ring-primary' 
                  : 'hover:scale-105'
              }`}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="space-y-4 p-4 rounded-lg bg-muted/50">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Countdown Timer
          </Label>
          <Switch
            checked={hasCountdown}
            onCheckedChange={(checked) => {
              setHasCountdown(checked);
              if (!checked) {
                setForm({ ...form, countdownTo: null });
              }
            }}
          />
        </div>
        {hasCountdown && (
          <div className="space-y-2">
            <Label className="text-sm">Count Down To</Label>
            <Input
              type="datetime-local"
              value={form.countdownTo ? new Date(form.countdownTo).toISOString().slice(0, 16) : ''}
              onChange={(e) => setForm({ 
                ...form, 
                countdownTo: e.target.value ? new Date(e.target.value).toISOString() : null 
              })}
            />
            <p className="text-xs text-muted-foreground">
              A countdown timer will appear showing time remaining
            </p>
          </div>
        )}
      </div>

      {/* Scheduling */}
      <div className="space-y-4 p-4 rounded-lg bg-muted/50">
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Schedule (Optional)
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Start Date</Label>
            <Input
              type="datetime-local"
              value={form.startsAt ? new Date(form.startsAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => setForm({ 
                ...form, 
                startsAt: e.target.value ? new Date(e.target.value).toISOString() : null 
              })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">End Date</Label>
            <Input
              type="datetime-local"
              value={form.endsAt ? new Date(form.endsAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => setForm({ 
                ...form, 
                endsAt: e.target.value ? new Date(e.target.value).toISOString() : null 
              })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave empty to show immediately with no end date
        </p>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between pt-2">
        <Label>Active</Label>
        <Switch
          checked={form.isActive}
          onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={() => onSave(form)} disabled={isSaving || !form.message.trim()}>
          {isSaving ? 'Saving...' : 'Save Promo Strip'}
        </Button>
      </DialogFooter>
    </div>
  );
}
