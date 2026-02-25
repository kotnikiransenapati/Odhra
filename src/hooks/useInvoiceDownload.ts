import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useInvoiceDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadInvoice = async (params: { invoice_id?: string; order_id?: string }) => {
    const key = params.invoice_id || params.order_id || '';
    setDownloading(key);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: params,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate invoice');

      // Open in new window for print-to-PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to download invoices');
        return;
      }

      printWindow.document.write(data.html);
      printWindow.document.close();

      // Auto-trigger print dialog (browser PDF save)
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };

      // Fallback: trigger print after a short delay
      setTimeout(() => {
        try { printWindow.print(); } catch { /* already printed */ }
      }, 800);

      toast.success(`Invoice ${data.invoice_number} ready for download`);
    } catch (err: any) {
      console.error('Invoice download error:', err);
      toast.error(err.message || 'Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  const printInvoice = async (params: { invoice_id?: string; order_id?: string }) => {
    // Same as download - browser print dialog lets user choose printer or PDF
    await downloadInvoice(params);
  };

  return { downloadInvoice, printInvoice, downloading };
}
