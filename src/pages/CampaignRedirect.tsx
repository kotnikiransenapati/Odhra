import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trackCampaignEvent } from '@/hooks/useCampaignLinks';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Campaign link resolver page.
 * URL: /c/:code
 * 
 * 1. Tracks the click event
 * 2. Stores campaign context in sessionStorage for personalization
 * 3. Redirects to the target path
 */
export default function CampaignRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    (async () => {
      try {
        const result = await trackCampaignEvent(code, 'click');

        if (!result?.success) {
          setError('This link has expired or is no longer available.');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }

        // Store campaign context for downstream personalization
        sessionStorage.setItem('odhra_campaign', JSON.stringify({
          code,
          link_id: result.link_id,
          campaign_type: result.campaign_type,
          personalization: result.personalization,
          metadata: result.metadata,
          clicked_at: new Date().toISOString(),
        }));

        // Also persist as UTM-like attribution
        sessionStorage.setItem('odhra_utm', JSON.stringify({
          source: 'campaign',
          medium: result.campaign_type,
          campaign: code,
        }));

        // Redirect to target
        const targetPath = result.target_path || '/';
        navigate(targetPath, { replace: true });
      } catch (err) {
        console.error('Campaign redirect error:', err);
        navigate('/', { replace: true });
      }
    })();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground">Redirecting to homepage...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}
