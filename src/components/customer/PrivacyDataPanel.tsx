import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, ShieldCheck, Loader2, AlertTriangle, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';

/**
 * GDPR / DPDP self-service.
 * - Export: invokes `gdpr-data-export` and downloads JSON locally.
 * - Delete: invokes `gdpr-account-deletion` (requires typing "DELETE"), then signs out.
 */
export function PrivacyDataPanel() {
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    haptic('light');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-data-export`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const dl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dl;
      a.download = `data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dl);
      haptic('success');
      toast({ title: 'Export ready', description: 'Your data was downloaded as JSON.' });
    } catch (e: any) {
      haptic('error');
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    haptic('warning');
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-account-deletion', {
        body: { confirm: 'DELETE' },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Account deleted', description: 'You are being signed out.' });
      setTimeout(() => signOut(), 1500);
    } catch (e: any) {
      haptic('error');
      toast({
        title: 'Deletion failed',
        description: e.message || 'Please contact support.',
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5 border border-border/40"
      aria-labelledby="privacy-data-heading"
    >
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-5 h-5 text-accent" aria-hidden />
        <h2 id="privacy-data-heading" className="font-semibold">Privacy & Your Data</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Download a copy of everything we store about you, or permanently delete your account.
        Order records may be retained in anonymized form to satisfy tax & legal requirements.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/50 p-4 flex flex-col gap-3 bg-background/40">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-accent" aria-hidden />
            <h3 className="font-medium text-sm">Export my data</h3>
          </div>
          <p className="text-xs text-muted-foreground flex-1">
            Get a JSON file with your profile, orders, reviews, loyalty, and preferences. Limited to once per hour.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="btn-press"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing…</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download JSON</>
            )}
          </Button>
        </div>

        <div className="rounded-xl border border-destructive/40 p-4 flex flex-col gap-3 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden />
            <h3 className="font-medium text-sm text-destructive">Delete account</h3>
          </div>
          <p className="text-xs text-muted-foreground flex-1">
            Permanently removes your profile, addresses, cart, wishlist & preferences. Cannot be undone.
          </p>
          <AlertDialog onOpenChange={(o) => !o && setConfirmText('')}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="btn-press">
                <Trash2 className="w-4 h-4 mr-2" /> Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" /> Delete account permanently?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    This wipes your profile, sessions, cart, wishlist, saved searches, addresses and
                    notification preferences. Past orders are kept in anonymized form for tax/legal reasons.
                  </span>
                  <span className="block font-medium text-foreground">
                    Type <code className="px-1.5 py-0.5 rounded bg-muted">DELETE</code> below to confirm.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-2">
                <Label htmlFor="confirm-delete" className="sr-only">Confirmation</Label>
                <Input
                  id="confirm-delete"
                  autoComplete="off"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…</>
                  ) : (
                    <>Yes, delete forever</>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.section>
  );
}
