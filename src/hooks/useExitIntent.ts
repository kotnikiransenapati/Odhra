import { useEffect, useState } from 'react';
import { attachExitIntent, markDismissed, type ExitIntentOptions } from '@/lib/conversion/exitIntent';

export function useExitIntent(enabled: boolean, opts: ExitIntentOptions) {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const detach = attachExitIntent(() => setTriggered(true), opts);
    return detach;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, opts.key]);

  const dismiss = () => {
    markDismissed(opts.key);
    setTriggered(false);
  };

  return { triggered, dismiss };
}
