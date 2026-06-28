import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { validateUniqueCode } from '@/hooks/useUniqueCodes';
import { captureRef } from '@/lib/referral/captureRef';
import { toast } from 'sonner';

/**
 * Public landing for unique URLs of the form /u/:slug.
 * Resolves the slug to its underlying code, persists it for the
 * downstream flow (referral capture / promo prefill), and redirects
 * to the policy-defined target path.
 */
export default function UniqueLinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      try {
        const res = await validateUniqueCode(undefined, slug);
        if (cancelled) return;
        if (!res.valid) {
          setError(
            res.reason === 'expired' ? 'This link has expired.' :
            res.reason === 'exhausted' ? 'This link has reached its usage limit.' :
            'This link is no longer valid.'
          );
          setTimeout(() => navigate('/', { replace: true }), 2500);
          return;
        }
        const code = String(res.code ?? '');
        const target = String(res.target_path ?? '/');
        const kind = String(res.kind ?? '');

        if (kind === 'referral') captureRef(code);
        try {
          sessionStorage.setItem('odhra_unique_code', code);
          sessionStorage.setItem('odhra_unique_code_kind', kind);
        } catch { /* ignore */ }

        toast.success('Personal offer applied — continue to claim it.');
        navigate(target || '/', { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to resolve link');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      {error ? (
        <>
          <p className="text-lg font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to homepage…</p>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Unlocking your personal offer…</p>
        </>
      )}
    </div>
  );
}
