import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApplyReferralCode } from "@/hooks/useReferrals";
import { getCapturedRef, clearCapturedRef } from "@/lib/referral/captureRef";
import { logLifecycleEvent } from "@/lib/lifecycle/events";

/**
 * Global widget. Once a user authenticates, automatically applies any
 * referral code captured before signup and logs a one-time `signup`
 * lifecycle event so server-side jobs can trigger the welcome series.
 *
 * No UI — completely invisible.
 */
export function ReferralAutoApply() {
  const { user } = useAuth();
  const apply = useApplyReferralCode();
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fire the signup lifecycle event exactly once per user/browser
    void logLifecycleEvent("signup", {
      userId: user.id,
      dedupeKey: `signup:${user.id}`,
    });

    const code = getCapturedRef();
    if (!code || attemptedRef.current === code) return;
    attemptedRef.current = code;

    apply.mutate(code, {
      onSettled: (data) => {
        // Always clear so we don't loop on validation errors (self-referral, etc.)
        clearCapturedRef();
        if (data?.success) {
          void logLifecycleEvent("tier_upgrade", {
            userId: user.id,
            dedupeKey: `referral_applied:${user.id}`,
            payload: { source: "referral_auto_apply" },
          });
        }
      },
    });
  }, [user, apply]);

  return null;
}

export default ReferralAutoApply;
