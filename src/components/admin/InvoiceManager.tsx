import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, Search, Download, Eye, Loader2, DollarSign,
  Clock, CheckCircle, XCircle, Plus, Printer
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  issued: { label: 'Issued', color: 'bg-blue-500/10 text-blue-600' },
  paid: { label: 'Paid', color: 'bg-green-500/10 text-green-600' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600' },
  void: { label: 'Void', color: 'bg-muted text-muted-foreground' },
};

const TYPE_LABELS: Record<string, string> = {
  sale: 'Tax Invoice',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  proforma: 'Proforma',
};

export function InvoiceManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('invoices') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + Number(i.total_amount), 0);
  const pendingAmount = invoices.filter((i: any) => i.status === 'issued').reduce((sum: number, i: any) => sum + Number(i.total_amount), 0);

  const filtered = invoices.filter((inv: any) => {
    const matchSearch = !search || inv.invoice_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || inv.invoice_type === typeFilter;
    return matchSearch && matchType;
  });

  const generateInvoiceHTML = (invoice: any) => {
    const items = invoice.items || [];
    const seller = invoice.seller_details || {};
    const buyer = invoice.buyer_details || {};
    
    return `
<!DOCTYPE html>
<html><head><style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
  .title { font-size: 24px; font-weight: bold; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f5f5f5; font-weight: 600; }
  .totals { text-align: right; margin-top: 20px; }
  .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 5px 0; }
  .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
</style></head><body>
  <div class="header">
    <div>
      <div class="title">${TYPE_LABELS[invoice.invoice_type] || 'Invoice'}</div>
      <p>${invoice.invoice_number}</p>
      <p>Date: ${format(new Date(invoice.created_at), 'dd MMM yyyy')}</p>
    </div>
    <div style="text-align: right;">
      <strong>${seller.name || 'Odhra Marketplace'}</strong>
      ${seller.gstin ? `<p>GSTIN: ${seller.gstin}</p>` : ''}
      ${seller.address || ''}
    </div>
  </div>
  <div style="margin-bottom: 20px;">
    <strong>Bill To:</strong><br/>
    ${buyer.name || 'Customer'}<br/>
    ${buyer.gstin ? `GSTIN: ${buyer.gstin}<br/>` : ''}
    ${buyer.address || ''}
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Total</th></tr></thead>
    <tbody>
      ${items.map((item: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description || ''}</td>
          <td>${item.hsn_code || '-'}</td>
          <td>${item.qty || 1}</td>
          <td>₹${Number(item.unit_price || 0).toLocaleString()}</td>
          <td>${item.tax_rate || 0}%</td>
          <td>₹${Number(item.total || 0).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal:</span><span>₹${Number(invoice.subtotal).toLocaleString()}</span></div>
    <div class="total-row"><span>Tax:</span><span>₹${Number(invoice.tax_amount).toLocaleString()}</span></div>
    ${invoice.discount_amount > 0 ? `<div class="total-row"><span>Discount:</span><span>-₹${Number(invoice.discount_amount).toLocaleString()}</span></div>` : ''}
    ${invoice.shipping_amount > 0 ? `<div class="total-row"><span>Shipping:</span><span>₹${Number(invoice.shipping_amount).toLocaleString()}</span></div>` : ''}
    <div class="total-row grand-total"><span>Total:</span><span>₹${Number(invoice.total_amount).toLocaleString()}</span></div>
  </div>
  ${invoice.notes ? `<div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;"><strong>Notes:</strong><p>${invoice.notes}</p></div>` : ''}
</body></html>`;
  };

  const handlePrint = (invoice: any) => {
    const html = generateInvoiceHTML(invoice);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = (invoice: any) => {
    const html = generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-muted-foreground text-sm">Generate, manage and download GST-compliant invoices</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{invoices.length}</p>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Paid Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹{pendingAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pending Amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">Tax Invoice</SelectItem>
            <SelectItem value="credit_note">Credit Note</SelectItem>
            <SelectItem value="debit_note">Debit Note</SelectItem>
            <SelectItem value="proforma">Proforma</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : (
                filtered.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}</Badge></TableCell>
                    <TableCell className="font-semibold">₹{Number(inv.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">₹{Number(inv.tax_amount).toLocaleString()}</TableCell>
                    <TableCell><Badge className={STATUS_CONFIG[inv.status]?.color || ''}>{STATUS_CONFIG[inv.status]?.label || inv.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(inv)}><Printer className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(inv)}><Download className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4" dangerouslySetInnerHTML={{ __html: generateInvoiceHTML(selectedInvoice) }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
