import { useState, useEffect, useRef } from 'react';

interface PincodeData {
  city: string;
  state: string;
  district: string;
  country: string;
}

const cache = new Map<string, PincodeData | null>();

export function usePincodeAutofill(pincode: string) {
  const [data, setData] = useState<PincodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      setData(null);
      return;
    }

    if (cache.has(pincode)) {
      setData(cache.get(pincode) || null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: controller.signal })
      .then(res => res.json())
      .then((result) => {
        if (result?.[0]?.Status === 'Success' && result[0].PostOffice?.length > 0) {
          const po = result[0].PostOffice[0];
          const parsed: PincodeData = {
            city: po.Block && po.Block !== 'NA' ? po.Block : po.District,
            state: po.State,
            district: po.District,
            country: po.Country || 'India',
          };
          cache.set(pincode, parsed);
          setData(parsed);
        } else {
          cache.set(pincode, null);
          setData(null);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          cache.set(pincode, null);
          setData(null);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [pincode]);

  return { data, isLoading };
}
