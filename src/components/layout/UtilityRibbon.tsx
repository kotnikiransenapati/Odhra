import React from "react";
import { Truck, ShieldCheck, RotateCcw } from "lucide-react";

/**
 * Slim utility ribbon — Amazon-style trust strip above the main navbar.
 * Uses semantic primary/primary-foreground tokens; no hardcoded colors.
 */
export const UtilityRibbon: React.FC = () => {
  return (
    <div className="bg-primary text-primary-foreground text-[11px] tracking-wider uppercase">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-8 flex items-center justify-between gap-4">
        <div className="hidden sm:flex items-center gap-5 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-accent" /> Free shipping ₹999+
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-accent" /> 7-day returns
          </span>
          <span className="hidden lg:inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Verified artisans
          </span>
        </div>
        <div className="flex items-center gap-5 font-medium ml-auto">
          <a href="/orders" className="hover:text-accent transition-colors">Track order</a>
          <a href="/help" className="hidden xs:inline hover:text-accent transition-colors">Help</a>
        </div>
      </div>
    </div>
  );
};

export default UtilityRibbon;
