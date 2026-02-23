import { usePriceDropNotifications } from "@/hooks/usePriceAlerts";
import { useCartAbandonmentTracker } from "@/hooks/useCartAbandonment";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useDeepLinkResolver } from "@/hooks/useDeepLinkResolver";

export default function DeferredHooks() {
  usePriceDropNotifications();
  useCartAbandonmentTracker();
  useSessionTimeout();
  useDeepLinkResolver();
  return null;
}
