import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SlipType = "packing" | "delivery" | "shipping_label";

interface DeliverySlipOptions {
  sub_order_ids: string[];
  slip_type: SlipType;
  weight?: string;
  dimensions?: { l: string; w: string; h: string };
}

export function useDeliverySlip() {
  const [generating, setGenerating] = useState(false);

  const generateSlip = async (options: DeliverySlipOptions) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-delivery-slip", {
        body: options,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to generate slip");

      // Open in new window for print
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Please allow popups to print slips");
        return;
      }
      win.document.write(data.html);
      win.document.close();
      // Auto-trigger print after load
      win.onload = () => win.print();

      const typeLabels: Record<SlipType, string> = {
        packing: "Packing slip",
        delivery: "Delivery slip",
        shipping_label: "Shipping label",
      };
      toast.success(`${typeLabels[options.slip_type]} generated (${data.count} order${data.count > 1 ? "s" : ""})`);
    } catch (err: any) {
      console.error("Slip generation error:", err);
      toast.error(err.message || "Failed to generate slip");
    } finally {
      setGenerating(false);
    }
  };

  return { generateSlip, generating };
}
