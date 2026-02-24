
-- Table to persist shared cart snapshots with unique share codes
CREATE TABLE public.shared_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  created_by UUID REFERENCES auth.users(id),
  session_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_count INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  message TEXT,
  views_count INTEGER DEFAULT 0,
  adds_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_carts ENABLE ROW LEVEL SECURITY;

-- Anyone can view a shared cart (public link)
CREATE POLICY "Anyone can view shared carts" ON public.shared_carts
  FOR SELECT USING (true);

-- Anyone can create a shared cart (logged in or anonymous)
CREATE POLICY "Anyone can create shared carts" ON public.shared_carts
  FOR INSERT WITH CHECK (true);

-- Anyone can update views/adds counts
CREATE POLICY "Anyone can update shared cart stats" ON public.shared_carts
  FOR UPDATE USING (true);

-- Index for fast lookup by share_code
CREATE INDEX idx_shared_carts_share_code ON public.shared_carts (share_code);

-- Enable realtime for shared carts
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_carts;
