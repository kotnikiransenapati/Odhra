CREATE OR REPLACE FUNCTION public.vendor_bulk_update_products(_updates jsonb, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_id uuid;
  _actor uuid := auth.uid();
  _item jsonb;
  _product_id uuid;
  _old record;
  _new_price numeric;
  _new_compare numeric;
  _new_stock integer;
  _new_threshold integer;
  _new_active boolean;
  _changed integer := 0;
  _details jsonb := '[]'::jsonb;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF jsonb_typeof(_updates) <> 'array' THEN
    RAISE EXCEPTION 'Updates must be an array';
  END IF;

  IF jsonb_array_length(_updates) = 0 THEN
    RETURN jsonb_build_object('updated', 0, 'details', '[]'::jsonb);
  END IF;

  IF jsonb_array_length(_updates) > 100 THEN
    RAISE EXCEPTION 'Bulk updates are limited to 100 products at a time';
  END IF;

  SELECT id INTO _vendor_id
  FROM public.vendors
  WHERE user_id = _actor
  LIMIT 1;

  IF _vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor account required';
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_updates)
  LOOP
    _product_id := NULLIF(_item->>'product_id', '')::uuid;
    IF _product_id IS NULL THEN
      RAISE EXCEPTION 'Each update requires a product_id';
    END IF;

    SELECT id, title, price, compare_at_price, stock, low_stock_threshold, is_active
    INTO _old
    FROM public.products
    WHERE id = _product_id AND vendor_id = _vendor_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or not owned by vendor: %', _product_id;
    END IF;

    _new_price := CASE WHEN _item ? 'price' THEN (_item->>'price')::numeric ELSE _old.price END;
    _new_compare := CASE
      WHEN _item ? 'compare_at_price' AND NULLIF(_item->>'compare_at_price', '') IS NULL THEN NULL
      WHEN _item ? 'compare_at_price' THEN (_item->>'compare_at_price')::numeric
      ELSE _old.compare_at_price
    END;
    _new_stock := CASE WHEN _item ? 'stock' THEN (_item->>'stock')::integer ELSE _old.stock END;
    _new_threshold := CASE WHEN _item ? 'low_stock_threshold' THEN (_item->>'low_stock_threshold')::integer ELSE _old.low_stock_threshold END;
    _new_active := CASE WHEN _item ? 'is_active' THEN (_item->>'is_active')::boolean ELSE _old.is_active END;

    IF _new_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative for %', _old.title; END IF;
    IF _new_compare IS NOT NULL AND _new_compare < 0 THEN RAISE EXCEPTION 'Compare price cannot be negative for %', _old.title; END IF;
    IF _new_stock < 0 THEN RAISE EXCEPTION 'Stock cannot be negative for %', _old.title; END IF;
    IF _new_threshold IS NOT NULL AND _new_threshold < 0 THEN RAISE EXCEPTION 'Low-stock threshold cannot be negative for %', _old.title; END IF;

    IF _new_price IS DISTINCT FROM _old.price
      OR _new_compare IS DISTINCT FROM _old.compare_at_price
      OR _new_stock IS DISTINCT FROM _old.stock
      OR _new_threshold IS DISTINCT FROM _old.low_stock_threshold
      OR _new_active IS DISTINCT FROM _old.is_active THEN
      UPDATE public.products
      SET price = _new_price,
          compare_at_price = _new_compare,
          stock = _new_stock,
          low_stock_threshold = _new_threshold,
          is_active = _new_active,
          last_restock_at = CASE WHEN _new_stock > _old.stock THEN now() ELSE last_restock_at END,
          updated_at = now()
      WHERE id = _old.id;

      _changed := _changed + 1;
      _details := _details || jsonb_build_array(jsonb_build_object(
        'product_id', _old.id,
        'title', _old.title,
        'before', jsonb_build_object(
          'price', _old.price,
          'compare_at_price', _old.compare_at_price,
          'stock', _old.stock,
          'low_stock_threshold', _old.low_stock_threshold,
          'is_active', _old.is_active
        ),
        'after', jsonb_build_object(
          'price', _new_price,
          'compare_at_price', _new_compare,
          'stock', _new_stock,
          'low_stock_threshold', _new_threshold,
          'is_active', _new_active
        )
      ));
    END IF;
  END LOOP;

  IF _changed > 0 THEN
    INSERT INTO public.batch_stock_operations(performed_by, operation_type, items_affected, details, notes)
    VALUES (_actor, 'bulk_catalog_update', _changed, _details, NULLIF(trim(COALESCE(_notes, '')), ''));
  END IF;

  RETURN jsonb_build_object('updated', _changed, 'details', _details);
END;
$$;

REVOKE ALL ON FUNCTION public.vendor_bulk_update_products(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_bulk_update_products(jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_vendor_announcement_save(
  _id uuid DEFAULT NULL,
  _title text DEFAULT '',
  _body text DEFAULT '',
  _priority text DEFAULT 'normal',
  _category text DEFAULT 'general',
  _target_mode text DEFAULT 'all',
  _target_vendor_ids uuid[] DEFAULT '{}',
  _cta_label text DEFAULT NULL,
  _cta_url text DEFAULT NULL,
  _status text DEFAULT 'draft',
  _publish_at timestamptz DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _saved_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  _title := trim(COALESCE(_title, ''));
  _body := trim(COALESCE(_body, ''));

  IF length(_title) < 3 THEN RAISE EXCEPTION 'Title must be at least 3 characters'; END IF;
  IF length(_body) < 5 THEN RAISE EXCEPTION 'Body must be at least 5 characters'; END IF;
  IF _priority NOT IN ('low','normal','high','critical') THEN RAISE EXCEPTION 'Invalid priority'; END IF;
  IF _category NOT IN ('general','policy','payout','product','outage','promotion') THEN RAISE EXCEPTION 'Invalid category'; END IF;
  IF _target_mode NOT IN ('all','kyc_verified','specific') THEN RAISE EXCEPTION 'Invalid target mode'; END IF;
  IF _status NOT IN ('draft','published','archived') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF _target_mode = 'specific' AND COALESCE(array_length(_target_vendor_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Specific target mode requires at least one vendor';
  END IF;
  IF _expires_at IS NOT NULL AND _publish_at IS NOT NULL AND _expires_at <= _publish_at THEN
    RAISE EXCEPTION 'Expiry must be after publish time';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.vendor_announcements(
      title, body, priority, category, target_mode, target_vendor_ids,
      cta_label, cta_url, status, publish_at, expires_at, created_by
    ) VALUES (
      _title, _body, _priority, _category, _target_mode,
      CASE WHEN _target_mode = 'specific' THEN _target_vendor_ids ELSE '{}'::uuid[] END,
      NULLIF(trim(COALESCE(_cta_label, '')), ''),
      NULLIF(trim(COALESCE(_cta_url, '')), ''),
      _status,
      CASE WHEN _status = 'published' AND _publish_at IS NULL THEN now() ELSE _publish_at END,
      _expires_at,
      auth.uid()
    ) RETURNING id INTO _saved_id;
  ELSE
    UPDATE public.vendor_announcements
    SET title = _title,
        body = _body,
        priority = _priority,
        category = _category,
        target_mode = _target_mode,
        target_vendor_ids = CASE WHEN _target_mode = 'specific' THEN _target_vendor_ids ELSE '{}'::uuid[] END,
        cta_label = NULLIF(trim(COALESCE(_cta_label, '')), ''),
        cta_url = NULLIF(trim(COALESCE(_cta_url, '')), ''),
        status = _status,
        publish_at = CASE WHEN _status = 'published' AND _publish_at IS NULL THEN COALESCE(publish_at, now()) ELSE _publish_at END,
        expires_at = _expires_at,
        updated_at = now()
    WHERE id = _id
    RETURNING id INTO _saved_id;

    IF _saved_id IS NULL THEN
      RAISE EXCEPTION 'Announcement not found';
    END IF;
  END IF;

  RETURN _saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_vendor_announcement_save(uuid, text, text, text, text, text, uuid[], text, text, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_vendor_announcement_save(uuid, text, text, text, text, text, uuid[], text, text, text, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_vendor_announcement_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_vendors integer := 0;
  _published integer := 0;
  _draft integer := 0;
  _critical integer := 0;
  _reads integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COUNT(*) INTO _total_vendors FROM public.vendors WHERE status = 'active';
  SELECT COUNT(*) FILTER (WHERE status = 'published'),
         COUNT(*) FILTER (WHERE status = 'draft'),
         COUNT(*) FILTER (WHERE status = 'published' AND priority = 'critical')
  INTO _published, _draft, _critical
  FROM public.vendor_announcements;
  SELECT COUNT(*) INTO _reads FROM public.vendor_announcement_reads;

  RETURN jsonb_build_object(
    'active_vendors', _total_vendors,
    'published', _published,
    'drafts', _draft,
    'critical_live', _critical,
    'total_reads', _reads
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_vendor_announcement_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_vendor_announcement_metrics() TO authenticated;