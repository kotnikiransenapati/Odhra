import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Search, Download, Eye, Loader2, DollarSign,
  Clock, CheckCircle, Printer, XCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  issued: { label: 'Issued', color: 'bg-info/10 text-info', icon: Clock },
  paid: { label: 'Paid', color: 'bg-success/10 text-success', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive', icon: XCircle },
  void: { label: 'Void', color: 'bg-muted text-muted-foreground', icon: XCircle },
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      if (status === 'paid') updates.paid_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      toast.success('Invoice status updated');
    },
    onError: () => toast.error('Failed to update invoice status'),
  });

  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
  const pendingAmount = invoices.filter((i: any) => i.status === 'issued').reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
  const cancelledCount = invoices.filter((i: any) => i.status === 'cancelled' || i.status === 'void').length;

  const filtered = invoices.filter((inv: any) => {
    const matchSearch = !search || 
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.seller_details?.name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || inv.invoice_type === typeFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const generateInvoiceHTML = (invoice: any) => {
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const seller = invoice.seller_details || {};
    const buyer = invoice.buyer_details || {};
    const escapeHtml = (str: string) => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));

    return `<!DOCTYPE html>
<html><head><style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
  .title { font-size: 24px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f5f5f5; font-weight: 600; }
  .totals { text-align: right; margin-top: 20px; }
  .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 5px 0; }
  .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
</style></head><body>
  <div class="header">
    <div>
      <div class="title">${escapeHtml(TYPE_LABELS[invoice.invoice_type] || 'Invoice')}</div>
      <p>${escapeHtml(invoice.invoice_number)}</p>
      <p>Date: ${format(new Date(invoice.created_at), 'dd MMM yyyy')}</p>
    </div>
    <div style="text-align: right;">
      <strong>${escapeHtml(seller.name || 'Marketplace')}</strong>
      ${seller.gstin ? `<p>GSTIN: ${escapeHtml(seller.gstin)}</p>` : ''}
    </div>
  </div>
  <div style="margin-bottom: 20px;">
    <strong>Bill To:</strong><br/>
    ${escapeHtml(buyer.name || 'Customer')}<br/>
    ${buyer.gstin ? `GSTIN: ${escapeHtml(buyer.gstin)}<br/>` : ''}
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Total</th></tr></thead>
    <tbody>
      ${items.map((item: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(item.description || '')}</td>
          <td>${escapeHtml(item.hsn_code || '-')}</td>
          <td>${item.qty || 1}</td>
          <td>₹${Number(item.unit_price || 0).toLocaleString()}</td>
          <td>${item.tax_rate || 0}%</td>
          <td>₹${Number(item.total || 0).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal:</span><span>₹${Number(invoice.subtotal || 0).toLocaleString()}</span></div>
    <div class="total-row"><span>Tax:</span><span>₹${Number(invoice.tax_amount || 0).toLocaleString()}</span></div>
    ${Number(invoice.discount_amount) > 0 ? `<div class="total-row"><span>Discount:</span><span>-₹${Number(invoice.discount_amount).toLocaleString()}</span></div>` : ''}
    ${Number(invoice.shipping_amount) > 0 ? `<div class="total-row"><span>Shipping:</span><span>₹${Number(invoice.shipping_amount).toLocaleString()}</span></div>` : ''}
    <div class="total-row grand-total"><span>Total:</span><span>₹${Number(invoice.total_amount || 0).toLocaleString()}</span></div>
  </div>
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
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Paid Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPrice(pendingAmount)}</p>
              <p className="text-xs text-muted-foreground">Pending Amount</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cancelledCount}</p>
              <p className="text-xs text-muted-foreground">Cancelled/Void</p>
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
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">Tax Invoice</SelectItem>
            <SelectItem value="credit_note">Credit Note</SelectItem>
            <SelectItem value="debit_note">Debit Note</SelectItem>
            <SelectItem value="proforma">Proforma</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="void">Void</SelectItem>
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
                <TableHead>Seller</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : (
                filtered.map((inv: any) => {
                  const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                  return (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedInvoice(inv)}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}</Badge></TableCell>
                      <TableCell className="text-sm">{inv.seller_details?.name || '—'}</TableCell>
                      <TableCell className="font-semibold">{formatPrice(Number(inv.total_amount || 0))}</TableCell>
                      <TableCell className="text-sm">{formatPrice(Number(inv.tax_amount || 0))}</TableCell>
                      <TableCell><Badge className={sc.color}>{sc.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePrint(inv)}><Printer className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(inv)}><Download className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">{TYPE_LABELS[selectedInvoice.invoice_type]}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={STATUS_CONFIG[selectedInvoice.status]?.color}>{STATUS_CONFIG[selectedInvoice.status]?.label}</Badge>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{formatPrice(Number(selectedInvoice.total_amount || 0))}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.created_at), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              {/* Seller / Buyer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/20">
                  <p className="text-xs text-muted-foreground mb-1">Seller</p>
                  <p className="font-medium">{selectedInvoice.seller_details?.name || 'Marketplace'}</p>
                  {selectedInvoice.seller_details?.gstin && <p className="text-xs font-mono">GSTIN: {selectedInvoice.seller_details.gstin}</p>}
                </div>
                <div className="p-3 rounded-lg bg-secondary/20">
                  <p className="text-xs text-muted-foreground mb-1">Buyer</p>
                  <p className="font-medium">{selectedInvoice.buyer_details?.name || 'Customer'}</p>
                  {selectedInvoice.buyer_details?.gstin && <p className="text-xs font-mono">GSTIN: {selectedInvoice.buyer_details.gstin}</p>}
                </div>
              </div>

              {/* Items */}
              {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Line Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs">HSN</TableHead>
                        <TableHead className="text-xs">Qty</TableHead>
                        <TableHead className="text-xs">Price</TableHead>
                        <TableHead className="text-xs">Tax</TableHead>
                        <TableHead className="text-xs">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{i + 1}</TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-sm font-mono">{item.hsn_code || '—'}</TableCell>
                          <TableCell className="text-sm">{item.qty || 1}</TableCell>
                          <TableCell className="text-sm">{formatPrice(Number(item.unit_price || 0))}</TableCell>
                          <TableCell className="text-sm">{item.tax_rate || 0}%</TableCell>
                          <TableCell className="text-sm font-semibold">{formatPrice(Number(item.total || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-right text-sm">
                <div className="flex justify-end gap-8"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(Number(selectedInvoice.subtotal || 0))}</span></div>
                <div className="flex justify-end gap-8"><span className="text-muted-foreground">Tax</span><span>{formatPrice(Number(selectedInvoice.tax_amount || 0))}</span></div>
                {Number(selectedInvoice.discount_amount) > 0 && (
                  <div className="flex justify-end gap-8"><span className="text-muted-foreground">Discount</span><span className="text-success">-{formatPrice(Number(selectedInvoice.discount_amount))}</span></div>
                )}
                {Number(selectedInvoice.shipping_amount) > 0 && (
                  <div className="flex justify-end gap-8"><span className="text-muted-foreground">Shipping</span><span>{formatPrice(Number(selectedInvoice.shipping_amount))}</span></div>
                )}
                <div className="flex justify-end gap-8 font-bold text-lg pt-2 border-t"><span>Total</span><span>{formatPrice(Number(selectedInvoice.total_amount || 0))}</span></div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedInvoice?.status === 'issued' && (
              <>
                <Button onClick={() => { updateStatusMutation.mutate({ id: selectedInvoice.id, status: 'paid' }); setSelectedInvoice(null); }} disabled={updateStatusMutation.isPending}>
                  <CheckCircle className="w-4 h-4 mr-2" />Mark as Paid
                </Button>
                <Button variant="destructive" onClick={() => { updateStatusMutation.mutate({ id: selectedInvoice.id, status: 'cancelled' }); setSelectedInvoice(null); }} disabled={updateStatusMutation.isPending}>
                  <XCircle className="w-4 h-4 mr-2" />Cancel
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => selectedInvoice && handlePrint(selectedInvoice)}>
              <Printer className="w-4 h-4 mr-2" />Print
            </Button>
            <Button variant="outline" onClick={() => selectedInvoice && handleDownload(selectedInvoice)}>
              <Download className="w-4 h-4 mr-2" />Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
