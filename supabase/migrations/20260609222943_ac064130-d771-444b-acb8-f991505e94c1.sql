
-- Helper function: fetch public shared wishlist with items
CREATE OR REPLACE FUNCTION public.get_public_shared_wishlist(_share_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sw RECORD;
  _items jsonb;
  _owner jsonb;
BEGIN
  SELECT id, user_id, share_code, title, description, is_public, view_count, created_at
    INTO _sw
  FROM public.shared_wishlists
  WHERE share_code = _share_code AND is_public = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', w.id,
    'product_id', w.product_id,
    'created_at', w.created_at,
    'product', jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'slug', p.slug,
      'price', p.price,
      'compare_at_price', p.compare_at_price,
      'stock', p.stock,
      'is_active', p.is_active,
      'images', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('url', pi.url, 'is_primary', pi.is_primary) ORDER BY pi.is_primary DESC NULLS LAST)
        FROM public.product_images pi WHERE pi.product_id = p.id
      ), '[]'::jsonb)
    )
  ) ORDER BY w.created_at DESC)
  INTO _items
  FROM public.wishlists w
  JOIN public.products p ON p.id = w.product_id AND p.is_active = true
  WHERE w.user_id = _sw.user_id;

  SELECT jsonb_build_object(
    'display_name', pr.display_name,
    'avatar_url', pr.avatar_url
  )
  INTO _owner
  FROM public.profiles pr
  WHERE pr.id = _sw.user_id;

  RETURN jsonb_build_object(
    'id', _sw.id,
    'share_code', _sw.share_code,
    'title', _sw.title,
    'description', _sw.description,
    'view_count', _sw.view_count,
    'created_at', _sw.created_at,
    'owner', COALESCE(_owner, '{}'::jsonb),
    'items', COALESCE(_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_shared_wishlist(text) TO anon, authenticated;

-- Bump view count atomically
CREATE OR REPLACE FUNCTION public.increment_shared_wishlist_view(_share_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shared_wishlists
  SET view_count = view_count + 1
  WHERE share_code = _share_code AND is_public = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_shared_wishlist_view(text) TO anon, authenticated;
