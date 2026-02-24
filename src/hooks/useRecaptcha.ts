import { useCallback, useEffect, useRef } from 'react';
import { useIntegration } from './useIntegrationSettings';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

function loadRecaptchaScript(siteKey: string) {
  if (document.querySelector(`script[src*="recaptcha"]`)) return;

  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  document.head.appendChild(script);
}

export function useRecaptcha() {
  const { isEnabled, config } = useIntegration('google_recaptcha');
  const loaded = useRef(false);

  useEffect(() => {
    if (isEnabled && config.site_key && !loaded.current) {
      loadRecaptchaScript(config.site_key);
      loaded.current = true;
    }
  }, [isEnabled, config.site_key]);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<{ success: boolean; score?: number }> => {
      if (!isEnabled || !config.site_key) {
        return { success: true }; // Bypass when disabled
      }

      try {
        return new Promise((resolve) => {
          window.grecaptcha.ready(async () => {
            try {
              const token = await window.grecaptcha.execute(config.site_key, { action });

              const { data, error } = await supabase.functions.invoke('recaptcha-verify', {
                body: { token, action, expectedAction: action },
              });

              if (error) {
                console.error('reCAPTCHA verify error:', error);
                resolve({ success: true }); // Fail open to not block users
              } else {
                resolve({
                  success: data.success,
                  score: data.score,
                });
              }
            } catch (err) {
              console.error('reCAPTCHA execution error:', err);
              resolve({ success: true }); // Fail open
            }
          });
        });
      } catch {
        return { success: true }; // Fail open
      }
    },
    [isEnabled, config.site_key]
  );

  return { executeRecaptcha, isEnabled };
}
