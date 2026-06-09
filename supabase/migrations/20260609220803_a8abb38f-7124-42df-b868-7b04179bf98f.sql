
CREATE TABLE IF NOT EXISTS public.custom_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  list_type text NOT NULL DEFAULT 'wishlist',
  is_public boolean NOT NULL DEFAULT false,
  share_slug text UNIQUE,
  cover_image_url text,
  event_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_lists TO authenticated;
GRANT SELECT ON public.custom_lists TO anon;
GRANT ALL ON public.custom_lists TO service_role;

ALTER TABLE public.custom_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their lists"
  ON public.custom_lists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public lists readable by anyone"
  ON public.custom_lists FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE INDEX IF NOT EXISTS idx_custom_lists_user ON public.custom_lists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_lists_share_slug ON public.custom_lists (share_slug) WHERE share_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.custom_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.custom_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  note text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_list_items TO authenticated;
GRANT SELECT ON public.custom_list_items TO anon;
GRANT ALL ON public.custom_list_items TO service_role;

ALTER TABLE public.custom_list_items ENABLE ROW LEVEL SECURITY;

-- Helper: avoids RLS recursion when joining items->lists
CREATE OR REPLACE FUNCTION public.is_list_owner(_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_lists
    WHERE id = _list_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_list_public(_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_lists
    WHERE id = _list_id AND is_public = true
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_list_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_list_owner(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_list_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_list_public(uuid) TO anon, authenticated;

CREATE POLICY "Owners manage their list items"
  ON public.custom_list_items FOR ALL TO authenticated
  USING (public.is_list_owner(list_id))
  WITH CHECK (public.is_list_owner(list_id));

CREATE POLICY "Public list items readable"
  ON public.custom_list_items FOR SELECT TO anon, authenticated
  USING (public.is_list_public(list_id));

CREATE INDEX IF NOT EXISTS idx_custom_list_items_list ON public.custom_list_items (list_id, position);

-- Validation: cap items at 200, sanitize quantity, set updated_at on lists
CREATE OR REPLACE FUNCTION public.validate_custom_list_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity < 1 OR NEW.quantity > 99 THEN
    RAISE EXCEPTION 'quantity must be between 1 and 99';
  END IF;
  IF length(coalesce(NEW.note, '')) > 280 THEN
    RAISE EXCEPTION 'note too long (max 280 chars)';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO _count FROM public.custom_list_items WHERE list_id = NEW.list_id;
    IF _count >= 200 THEN
      RAISE EXCEPTION 'lists are limited to 200 items';
    END IF;
  END IF;
  UPDATE public.custom_lists SET updated_at = now() WHERE id = NEW.list_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_custom_list_item ON public.custom_list_items;
CREATE TRIGGER trg_validate_custom_list_item
BEFORE INSERT OR UPDATE ON public.custom_list_items
FOR EACH ROW EXECUTE FUNCTION public.validate_custom_list_item();

CREATE OR REPLACE FUNCTION public.bump_custom_list_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  -- Auto-mint share_slug when the list becomes public
  IF NEW.is_public = true AND (NEW.share_slug IS NULL OR NEW.share_slug = '') THEN
    NEW.share_slug := encode(gen_random_bytes(6), 'hex');
  END IF;
  IF NEW.list_type NOT IN ('wishlist','registry','gift','project','custom') THEN
    RAISE EXCEPTION 'invalid list_type';
  END IF;
  IF length(coalesce(NEW.name, '')) < 1 OR length(NEW.name) > 80 THEN
    RAISE EXCEPTION 'name must be 1-80 chars';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_custom_list_updated_at ON public.custom_lists;
CREATE TRIGGER trg_bump_custom_list_updated_at
BEFORE INSERT OR UPDATE ON public.custom_lists
FOR EACH ROW EXECUTE FUNCTION public.bump_custom_list_updated_at();
