import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CookiePreferences {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'cookie_consent';
const SESSION_ID_KEY = 'session_id';

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function useCookieConsent() {
  const { user } = useAuth();
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    functional: true,
    analytics: false,
    marketing: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  // Load consent from localStorage first, then sync with database
  useEffect(() => {
    const loadConsent = async () => {
      setIsLoading(true);
      
      // Check localStorage first
      const localConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (localConsent) {
        try {
          const parsed = JSON.parse(localConsent);
          setPreferences(parsed);
          setHasConsented(true);
          setShowBanner(false);
        } catch {
          setShowBanner(true);
        }
      } else {
        setShowBanner(true);
      }

      // If user is logged in, try to sync with database
      if (user) {
        try {
          const { data } = await supabase
            .from('cookie_consents')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            const dbPreferences: CookiePreferences = {
              functional: data.functional_consent,
              analytics: data.analytics_consent,
              marketing: data.marketing_consent,
            };
            setPreferences(dbPreferences);
            setHasConsented(true);
            setShowBanner(false);
            localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(dbPreferences));
          }
        } catch (error) {
          console.error('Failed to load cookie consent:', error);
        }
      }

      setIsLoading(false);
    };

    loadConsent();
  }, [user]);

  const saveConsent = useCallback(async (newPreferences: CookiePreferences) => {
    setPreferences(newPreferences);
    setHasConsented(true);
    setShowBanner(false);
    
    // Save to localStorage
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newPreferences));

    // Save to database
    try {
      const consentData = {
        user_id: user?.id || null,
        session_id: user ? null : getSessionId(),
        functional_consent: newPreferences.functional,
        analytics_consent: newPreferences.analytics,
        marketing_consent: newPreferences.marketing,
      };

      if (user) {
        await supabase
          .from('cookie_consents')
          .upsert(consentData, {
            onConflict: 'user_id',
          });
      } else {
        await supabase
          .from('cookie_consents')
          .insert(consentData);
      }
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  }, [user]);

  const acceptAll = useCallback(() => {
    saveConsent({
      functional: true,
      analytics: true,
      marketing: true,
    });
    toast.success('Cookie preferences saved');
  }, [saveConsent]);

  const rejectNonEssential = useCallback(() => {
    saveConsent({
      functional: true,
      analytics: false,
      marketing: false,
    });
    toast.success('Cookie preferences saved');
  }, [saveConsent]);

  const saveCustom = useCallback((customPreferences: CookiePreferences) => {
    saveConsent(customPreferences);
    toast.success('Cookie preferences saved');
  }, [saveConsent]);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    setHasConsented(false);
    setShowBanner(true);
    setPreferences({
      functional: true,
      analytics: false,
      marketing: false,
    });
  }, []);

  return {
    hasConsented,
    preferences,
    isLoading,
    showBanner,
    setShowBanner,
    acceptAll,
    rejectNonEssential,
    saveCustom,
    resetConsent,
  };
}
