import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Download,
  Printer,
  Truck,
  CheckCircle2,
  XCircle,
  Package,
  Loader2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface BulkOrderActionsProps {
  selectedOrders: string[];
  orders: any[];
  onClearSelection: () => void;
}

type BulkAction = 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel' | 'export_csv' | 'export_json' | 'print_invoices';

export function BulkOrderActions({ selectedOrders, orders, onClearSelection }: BulkOrderActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const queryClient = useQueryClient();

  const selectedOrderData = orders.filter(o => selectedOrders.includes(o.id));

  const handleBulkStatusUpdate = async (newStatus: string) => {
    setIsProcessing(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const orderId of selectedOrders) {
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: newStatus as any,
            admin_note: adminNote || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) {
          failCount++;
          console.error(`Failed to update order ${orderId}:`, error);
        } else {
          successCount++;

          // Log to order activity
          await supabase.from('order_activity_log').insert({
            order_id: orderId,
            activity_type: 'status_change',
            title: `Bulk status update to ${newStatus}`,
            description: adminNote || `Order status changed to ${newStatus} via bulk action`,
            actor_type: 'admin',
            actor_id: (await supabase.auth.getUser()).data.user?.id || null,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      
      if (successCount > 0) {
        toast.success(`${successCount} order(s) updated to "${newStatus}"`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} order(s) failed to update`);
      }

      onClearSelection();
      setConfirmAction(null);
      setAdminNote('');
    } catch (error) {
      toast.error('Bulk action failed');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = selectedOrderData.map(order => ({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      status: order.status,
      payment_status: order.payment_status,
      subtotal: order.subtotal,
      shipping_amount: order.shipping_amount || 0,
      tax_amount: order.tax_amount || 0,
      discount_amount: order.discount_amount || 0,
      total_amount: order.total_amount,
      currency: order.currency,
      payment_method: order.payment_method || '',
      created_at: order.created_at,
      shipping_name: (order.shipping_address as any)?.name || '',
      shipping_city: (order.shipping_address as any)?.city || '',
      shipping_state: (order.shipping_address as any)?.state || '',
      shipping_pincode: (order.shipping_address as any)?.pincode || '',
      shipping_phone: (order.shipping_address as any)?.phone || '',
    }));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      content = [headers, ...rows].join('\n');
      filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(data, null, 2);
      filename = `orders_export_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${data.length} orders exported as ${format.toUpperCase()}`);
  };

  const handlePrintInvoices = () => {
    const printContent = selectedOrderData.map(order => `
      <div style="page-break-after: always; padding: 40px; font-family: system-ui, sans-serif;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h1 style="font-size: 24px; margin: 0;">INVOICE</h1>
            <p style="color: #666; margin: 5px 0;">Order: ${order.order_number}</p>
            <p style="color: #666; margin: 5px 0;">Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0;">Odhra</h2>
            <p style="color: #666; margin: 5px 0;">Premium Marketplace</p>
          </div>
        </div>
        <hr style="border: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between; margin: 20px 0;">
          <div>
            <h3 style="margin: 0 0 10px;">Bill To:</h3>
            <p style="margin: 2px 0;">${order.customer_name}</p>
            <p style="margin: 2px 0;">${order.customer_email}</p>
            <p style="margin: 2px 0;">${(order.shipping_address as any)?.name || ''}</p>
            <p style="margin: 2px 0;">${(order.shipping_address as any)?.address || ''}</p>
            <p style="margin: 2px 0;">${(order.shipping_address as any)?.city || ''}, ${(order.shipping_address as any)?.state || ''} ${(order.shipping_address as any)?.pincode || ''}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 2px 0;"><strong>Status:</strong> ${order.status}</p>
            <p style="margin: 2px 0;"><strong>Payment:</strong> ${order.payment_status}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Subtotal</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${order.subtotal.toLocaleString()}</td>
          </tr>
          ${order.shipping_amount ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Shipping</td><td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${order.shipping_amount.toLocaleString()}</td></tr>` : ''}
          ${order.tax_amount ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Tax</td><td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${order.tax_amount.toLocaleString()}</td></tr>` : ''}
          ${order.discount_amount ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee; color: green;">Discount</td><td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: green;">-₹${order.discount_amount.toLocaleString()}</td></tr>` : ''}
          <tr style="font-weight: bold; font-size: 18px;">
            <td style="padding: 10px; border-top: 2px solid #333;">Total</td>
            <td style="padding: 10px; text-align: right; border-top: 2px solid #333;">₹${order.total_amount.toLocaleString()}</td>
          </tr>
        </table>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Invoices - Odhra</title></head>
        <body>${printContent}</body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    toast.success(`${selectedOrderData.length} invoice(s) sent to print`);
  };

  const executeAction = (action: BulkAction) => {
    switch (action) {
      case 'confirm':
      case 'process':
      case 'ship':
      case 'deliver':
      case 'cancel':
        setConfirmAction(action);
        break;
      case 'export_csv':
        handleExport('csv');
        break;
      case 'export_json':
        handleExport('json');
        break;
      case 'print_invoices':
        handlePrintInvoices();
        break;
    }
  };

  const statusMap: Record<string, string> = {
    confirm: 'confirmed',
    process: 'processing',
    ship: 'shipped',
    deliver: 'delivered',
    cancel: 'cancelled',
  };

  if (selectedOrders.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20">
        <Badge variant="default" className="text-sm px-3 py-1">
          {selectedOrders.length} selected
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Package className="w-4 h-4" />
              Change Status
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => executeAction('confirm')}>
              <CheckCircle2 className="w-4 h-4 mr-2 text-info" /> Confirm All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => executeAction('process')}>
              <Package className="w-4 h-4 mr-2 text-primary" /> Mark Processing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => executeAction('ship')}>
              <Truck className="w-4 h-4 mr-2 text-info" /> Mark Shipped
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => executeAction('deliver')}>
              <CheckCircle2 className="w-4 h-4 mr-2 text-success" /> Mark Delivered
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => executeAction('cancel')} className="text-destructive">
              <XCircle className="w-4 h-4 mr-2" /> Cancel All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => executeAction('export_csv')}>
              <FileText className="w-4 h-4 mr-2" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => executeAction('export_json')}>
              <FileText className="w-4 h-4 mr-2" /> Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" className="gap-2" onClick={() => executeAction('print_invoices')}>
          <Printer className="w-4 h-4" />
          Print Invoices
        </Button>

        <Button variant="ghost" size="sm" onClick={onClearSelection} className="ml-auto">
          Clear Selection
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => { setConfirmAction(null); setAdminNote(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction === 'cancel' ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
              Confirm Bulk Action
            </DialogTitle>
            <DialogDescription>
              You are about to change the status of <strong>{selectedOrders.length} order(s)</strong> to{' '}
              <Badge variant={confirmAction === 'cancel' ? 'destructive' : 'default'}>
                {confirmAction && statusMap[confirmAction]}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-40 overflow-y-auto space-y-1 p-3 rounded-lg bg-secondary/30">
              {selectedOrderData.map(order => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{order.order_number}</span>
                  <span className="text-muted-foreground">{order.customer_name}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Admin Note (optional)</label>
              <Textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Add a note for this bulk action..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmAction(null); setAdminNote(''); }}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'cancel' ? 'destructive' : 'default'}
              onClick={() => confirmAction && handleBulkStatusUpdate(statusMap[confirmAction])}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmAction === 'cancel' ? 'Cancel Orders' : 'Update Orders'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
