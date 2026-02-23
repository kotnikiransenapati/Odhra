import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, XCircle, Clock, Loader2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const DOCUMENT_TYPES = [
  { value: 'pan_card', label: 'PAN Card', required: true },
  { value: 'aadhaar', label: 'Aadhaar Card', required: true },
  { value: 'gst_certificate', label: 'GST Certificate', required: false },
  { value: 'bank_statement', label: 'Bank Statement', required: false },
  { value: 'address_proof', label: 'Address Proof', required: false },
];

interface KYCDocumentUploadProps {
  vendorId: string;
}

export function KYCDocumentUpload({ vendorId }: KYCDocumentUploadProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['vendor-kyc-docs', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_kyc_documents')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, or PDF files are allowed');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${selectedType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-documents')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-documents')
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from('vendor_kyc_documents')
        .insert({
          vendor_id: vendorId,
          document_type: selectedType,
          document_url: publicUrl,
          document_number: documentNumber || null,
        });

      if (dbError) throw dbError;

      // Update vendor kyc_status
      await supabase.from('vendors').update({ kyc_status: 'submitted' }).eq('id', vendorId);

      queryClient.invalidateQueries({ queryKey: ['vendor-kyc-docs'] });
      toast.success('Document uploaded successfully');
      setSelectedType('');
      setDocumentNumber('');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return <Badge className="bg-success/10 text-success border-success/20">Verified</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline" className="text-warning border-warning/30">Pending</Badge>;
    }
  };

  const uploadedTypes = documents.map(d => d.document_type);
  const availableTypes = DOCUMENT_TYPES.filter(t => !uploadedTypes.includes(t.value) || documents.find(d => d.document_type === t.value && d.status === 'rejected'));

  const requiredDocs = DOCUMENT_TYPES.filter(t => t.required);
  const verifiedRequired = requiredDocs.filter(t => documents.some(d => d.document_type === t.value && d.status === 'verified'));
  const kycProgress = requiredDocs.length > 0 ? Math.round((verifiedRequired.length / requiredDocs.length) * 100) : 0;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* KYC Progress */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">KYC Verification</h3>
              <p className="text-sm text-muted-foreground">
                {kycProgress === 100 ? 'All required documents verified!' : `${verifiedRequired.length}/${requiredDocs.length} required documents verified`}
              </p>
            </div>
            <Badge className={cn(
              kycProgress === 100 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            )}>
              {kycProgress}%
            </Badge>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", kycProgress === 100 ? "bg-success" : "bg-accent")}
              style={{ width: `${kycProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload New Document */}
      {availableTypes.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent" />
              Upload Document
            </CardTitle>
            <CardDescription>Upload identity and business documents for verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {availableTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label} {t.required && <span className="text-destructive">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Number (optional)</Label>
                <Input 
                  value={documentNumber} 
                  onChange={e => setDocumentNumber(e.target.value)} 
                  placeholder="e.g. ABCDE1234F"
                />
              </div>
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleUpload}
                disabled={!selectedType || uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                selectedType ? "border-accent/30 hover:border-accent/50 cursor-pointer" : "border-muted cursor-not-allowed opacity-50"
              )}>
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
                ) : (
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                )}
                <p className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click or drag to upload'}</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or PDF up to 10MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Uploaded Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No documents uploaded yet</p>
              <p className="text-xs mt-1">Upload PAN Card and Aadhaar to start verification</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <p className="font-medium text-sm">
                        {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_number && `${doc.document_number} · `}
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                      {doc.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">Reason: {doc.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
