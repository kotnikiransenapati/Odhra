CREATE OR REPLACE FUNCTION public.refresh_product_associations(
  p_since timestamptz DEFAULT now() - interval '180 days',
  p_limit integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bought_count integer := 0;
  v_similar_count integer := 0;
BEGIN
  WITH item_orders AS (
    SELECT DISTINCT so.order_id, oi.product_id
    FROM public.order_items oi
    JOIN public.sub_orders so ON so.id = oi.sub_order_id
    JOIN public.orders o ON o.id = so.order_id
    WHERE oi.product_id IS NOT NULL
      AND o.created_at >= p_since
      AND o.status NOT IN ('cancelled', 'refunded')
      AND o.payment_status IN ('paid', 'escrow', 'cod_pending')
  ),
  pairs AS (
    SELECT
      a.product_id,
      b.product_id AS associated_product_id,
      count(*)::integer AS purchase_count
    FROM item_orders a
    JOIN item_orders b
      ON b.order_id = a.order_id
     AND b.product_id <> a.product_id
    GROUP BY a.product_id, b.product_id
    ORDER BY purchase_count DESC
    LIMIT greatest(p_limit, 1)
  ),
  ranked_pairs AS (
    SELECT
      product_id,
      associated_product_id,
      purchase_count,
      least(1, purchase_count::numeric / greatest(max(purchase_count) OVER (), 1)) AS strength
    FROM pairs
  ),
  upserted AS (
    INSERT INTO public.product_associations (
      product_id,
      associated_product_id,
      association_type,
      strength,
      purchase_count,
      updated_at
    )
    SELECT
      product_id,
      associated_product_id,
      'frequently_bought_together',
      strength,
      purchase_count,
      now()
    FROM ranked_pairs
    ON CONFLICT (product_id, associated_product_id, association_type)
    DO UPDATE SET
      strength = EXCLUDED.strength,
      purchase_count = EXCLUDED.purchase_count,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_bought_count FROM upserted;

  WITH candidate_pairs AS (
    SELECT
      p1.id AS product_id,
      p2.id AS associated_product_id,
      (
        CASE WHEN p1.category_id IS NOT NULL AND p1.category_id = p2.category_id THEN 0.45 ELSE 0 END
        + least(0.35, coalesce(shared.shared_tags, 0) * 0.08)
        + least(0.10, coalesce(p2.avg_rating, 0) / 50)
        + least(0.10, coalesce(p2.sold_count, 0) / 1000.0)
      )::numeric AS strength
    FROM public.products p1
    JOIN public.products p2
      ON p2.id <> p1.id
     AND p2.is_active = true
     AND (
       (p1.category_id IS NOT NULL AND p1.category_id = p2.category_id)
       OR (coalesce(p1.tags, ARRAY[]::text[]) && coalesce(p2.tags, ARRAY[]::text[]))
     )
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS shared_tags
      FROM unnest(coalesce(p1.tags, ARRAY[]::text[])) tag
      WHERE tag = ANY(coalesce(p2.tags, ARRAY[]::text[]))
    ) shared ON true
    WHERE p1.is_active = true
  ),
  ranked AS (
    SELECT
      product_id,
      associated_product_id,
      strength,
      row_number() OVER (PARTITION BY product_id ORDER BY strength DESC, associated_product_id) AS rn
    FROM candidate_pairs
    WHERE strength > 0
  ),
  upserted AS (
    INSERT INTO public.product_associations (
      product_id,
      associated_product_id,
      association_type,
      strength,
      purchase_count,
      updated_at
    )
    SELECT
      product_id,
      associated_product_id,
      'similar',
      strength,
      0,
      now()
    FROM ranked
    WHERE rn <= 8
    LIMIT greatest(p_limit, 1)
    ON CONFLICT (product_id, associated_product_id, association_type)
    DO UPDATE SET
      strength = greatest(public.product_associations.strength, EXCLUDED.strength),
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_similar_count FROM upserted;

  RETURN jsonb_build_object(
    'frequently_bought_updated', v_bought_count,
    'similar_updated', v_similar_count,
    'since', p_since
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_product_associations(timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_product_associations(timestamptz, integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_product_associations_lookup
ON public.product_associations(product_id, association_type, strength DESC, purchase_count DESC);