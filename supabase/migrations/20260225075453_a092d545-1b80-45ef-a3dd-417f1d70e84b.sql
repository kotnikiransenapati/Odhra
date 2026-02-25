-- Add missing columns for compute_vendor_performance compatibility
ALTER TABLE public.vendor_performance_metrics 
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS grade text DEFAULT 'average';

-- Add unique constraint for upsert in compute_vendor_performance
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_performance_metrics_vendor_period_unique'
  ) THEN
    ALTER TABLE public.vendor_performance_metrics 
      ADD CONSTRAINT vendor_performance_metrics_vendor_period_unique 
      UNIQUE (vendor_id, period_start, period_end);
  END IF;
END $$;

-- Create index for faster vendor-specific lookups
CREATE INDEX IF NOT EXISTS idx_vpm_vendor_period 
  ON public.vendor_performance_metrics (vendor_id, period_start DESC, period_end DESC);