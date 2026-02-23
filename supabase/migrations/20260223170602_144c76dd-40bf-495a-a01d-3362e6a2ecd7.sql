
-- Vendor KYC documents table
CREATE TABLE public.vendor_kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'pan_card', 'aadhaar', 'gst_certificate', 'bank_statement', 'address_proof'
  document_url TEXT NOT NULL,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  rejection_reason TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_kyc_documents ENABLE ROW LEVEL SECURITY;

-- Vendors can see their own documents
CREATE POLICY "Vendors can view own KYC docs" ON public.vendor_kyc_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Vendors can upload their own documents
CREATE POLICY "Vendors can insert own KYC docs" ON public.vendor_kyc_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
  );

-- Only admins can update (verify/reject)
CREATE POLICY "Admins can update KYC docs" ON public.vendor_kyc_documents
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Add kyc_status to vendors table
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_started';

-- Create vendor-documents storage bucket  
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-documents', 'vendor-documents', false) ON CONFLICT (id) DO NOTHING;

-- Only vendor owners and admins can read vendor documents
CREATE POLICY "Vendor owners can read their documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'vendor-documents' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin(auth.uid())
    )
  );

-- Vendors can upload to their own folder
CREATE POLICY "Vendors can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vendor-documents' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at
CREATE TRIGGER update_vendor_kyc_documents_updated_at
  BEFORE UPDATE ON public.vendor_kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
