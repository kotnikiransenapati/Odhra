import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAdminVendorKycDocuments, useAdminVendors, useReviewVendorKyc, useUpdateVendor, Vendor } from '@/hooks/useAdmin';
import { useVendorImpersonation } from '@/contexts/VendorImpersonationContext';
import {
  Store,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Mail,
  Calendar,
  Percent,
  UserCog,
  FileText,
  ExternalLink,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_LABELS: Record<string, string> = {
  pan_card: 'PAN Card',
  aadhaar: 'Aadhaar Card',
  gst_certificate: 'GST Certificate',
  bank_statement: 'Bank Statement',
  address_proof: 'Address Proof',
};

const REQUIRED_KYC_DOCS = ['pan_card', 'aadhaar'];

export function VendorManagement() {
  const navigate = useNavigate();
  const { data: vendors, isLoading } = useAdminVendors();
  const updateVendor = useUpdateVendor();
  const reviewKyc = useReviewVendorKyc();
  const { startImpersonation } = useVendorImpersonation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'kyc' | 'pending' | 'active' | 'inactive'>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { data: kycDocs = [], isLoading: kycLoading } = useAdminVendorKycDocuments(selectedVendor?.id);

  const handleImpersonate = (vendor: Vendor) => {
    startImpersonation({
      id: vendor.id,
      brand_name: vendor.brand_name,
      logo_url: vendor.logo_url,
      user_email: vendor.user_email,
    });
    toast.success(`Now viewing as ${vendor.brand_name}`);
    navigate('/vendor');
  };

  const filteredVendors = vendors?.filter((vendor) => {
    const matchesSearch =
      vendor.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      vendor.user_email?.toLowerCase().includes(search.toLowerCase());

    if (filter === 'kyc') return matchesSearch && vendor.kyc_status === 'submitted';
    if (filter === 'pending') return matchesSearch && !vendor.is_verified;
    if (filter === 'active') return matchesSearch && vendor.is_active && vendor.is_verified;
    if (filter === 'inactive') return matchesSearch && !vendor.is_active;
    return matchesSearch;
  });

  const kycSummary = useMemo(() => {
    const uploaded = new Set(kycDocs.map((doc) => doc.document_type));
    const requiredUploaded = REQUIRED_KYC_DOCS.filter((type) => uploaded.has(type)).length;
    const pending = kycDocs.filter((doc) => doc.status === 'pending').length;
    const verified = kycDocs.filter((doc) => doc.status === 'verified').length;
    const rejected = kycDocs.filter((doc) => doc.status === 'rejected').length;
    return { requiredUploaded, pending, verified, rejected };
  }, [kycDocs]);

  const handleApprove = (vendor: Vendor) => {
    if (vendor.kyc_status === 'submitted') {
      reviewKyc.mutate({ vendorId: vendor.id, action: 'approve' });
      return;
    }

    updateVendor.mutate({ vendorId: vendor.id, updates: { is_verified: true, is_active: true, kyc_status: 'verified' } });
  };

  const handleRejectKyc = (vendor: Vendor) => {
    if (!rejectionReason.trim()) {
      toast.error('Add a rejection reason for the vendor');
      return;
    }
    reviewKyc.mutate({ vendorId: vendor.id, action: 'reject', rejectionReason: rejectionReason.trim() });
  };

  const handleToggleActive = (vendor: Vendor) => {
    updateVendor.mutate({
      vendorId: vendor.id,
      updates: { is_active: !vendor.is_active },
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const kycBadge = (vendor: Vendor) => {
    const status = vendor.kyc_status || (vendor.is_verified ? 'verified' : 'not_started');
    if (status === 'verified') return <Badge variant="outline" className="bg-success/10 text-success border-success/20">KYC verified</Badge>;
    if (status === 'submitted') return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">KYC review</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">KYC rejected</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">KYC pending</Badge>;
  };

  const openDocument = async (url: string) => {
    if (!url) return;
    const marker = '/vendor-documents/';
    const path = url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null;
    if (!path) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const { data, error } = await supabase.storage.from('vendor-documents').createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast.error('Unable to open document');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'active', 'inactive'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Vendors ({filteredVendors?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors?.map((vendor, index) => (
                  <motion.tr
                    key={vendor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          {vendor.logo_url ? (
                            <img
                              src={vendor.logo_url}
                              alt={vendor.brand_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{vendor.brand_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {vendor.user_email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!vendor.is_verified ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          Pending
                        </Badge>
                      ) : vendor.is_active ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{vendor.commission_rate}%</TableCell>
                    <TableCell>{formatPrice(vendor.balance)}</TableCell>
                    <TableCell>
                      {format(new Date(vendor.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedVendor(vendor)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleImpersonate(vendor)}
                          title="Login as Vendor"
                          className="text-accent hover:text-accent"
                        >
                          <UserCog className="w-4 h-4" />
                        </Button>
                        {!vendor.is_verified ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-success hover:text-success"
                            onClick={() => handleApprove(vendor)}
                            disabled={updateVendor.isPending}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={vendor.is_active ? 'text-destructive hover:text-destructive/80' : 'text-success hover:text-success/80'}
                            onClick={() => handleToggleActive(vendor)}
                            disabled={updateVendor.isPending}
                          >
                            {vendor.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Detail Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {selectedVendor?.brand_name}
            </DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0">
                  {selectedVendor.logo_url ? (
                    <img
                      src={selectedVendor.logo_url}
                      alt={selectedVendor.brand_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{selectedVendor.bio || 'No bio provided'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedVendor.user_email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(selectedVendor.created_at), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedVendor.commission_rate}% commission</span>
                </div>
                <div>
                  <span className="text-muted-foreground">GST: </span>
                  <span>{selectedVendor.gst_number || 'Not provided'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="text-lg font-bold">{formatPrice(selectedVendor.balance)}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Pending Balance</p>
                  <p className="text-lg font-bold">{formatPrice(selectedVendor.pending_balance)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVendor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
