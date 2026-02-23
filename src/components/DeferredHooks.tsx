import { usePriceDropNotifications } from "@/hooks/usePriceAlerts";
import { useCartAbandonmentTracker } from "@/hooks/useCartAbandonment";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function DeferredHooks() {
  usePriceDropNotifications();
  useCartAbandonmentTracker();
  useSessionTimeout();
  return null;
}
