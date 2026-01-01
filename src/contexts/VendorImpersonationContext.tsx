import React, { createContext, useContext, useState, useCallback } from 'react';

interface ImpersonatedVendor {
  id: string;
  brand_name: string;
  logo_url: string | null;
  user_email: string | null;
}

interface VendorImpersonationContextType {
  impersonatedVendor: ImpersonatedVendor | null;
  isImpersonating: boolean;
  startImpersonation: (vendor: ImpersonatedVendor) => void;
  stopImpersonation: () => void;
}

const VendorImpersonationContext = createContext<VendorImpersonationContextType | undefined>(undefined);

export function VendorImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [impersonatedVendor, setImpersonatedVendor] = useState<ImpersonatedVendor | null>(null);

  const startImpersonation = useCallback((vendor: ImpersonatedVendor) => {
    setImpersonatedVendor(vendor);
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedVendor(null);
  }, []);

  return (
    <VendorImpersonationContext.Provider
      value={{
        impersonatedVendor,
        isImpersonating: !!impersonatedVendor,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </VendorImpersonationContext.Provider>
  );
}

export function useVendorImpersonation() {
  const context = useContext(VendorImpersonationContext);
  if (context === undefined) {
    throw new Error('useVendorImpersonation must be used within a VendorImpersonationProvider');
  }
  return context;
}
