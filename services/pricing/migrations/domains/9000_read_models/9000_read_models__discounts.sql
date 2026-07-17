-- Up Migration

CREATE VIEW "pricing"."discount_list_view" AS
SELECT
  discount.store_id,
  discount.id,
  discount.method,
  discount.kind,
  discount.discount_class,
  discount.state,
  (
    CASE
      WHEN discount.state = 'DRAFT' THEN 'DRAFT'
      WHEN discount.state = 'PAUSED' THEN 'PAUSED'
      WHEN discount.state = 'ARCHIVED' THEN 'ARCHIVED'
      WHEN now() < discount.starts_at THEN 'SCHEDULED'
      WHEN discount.ends_at IS NOT NULL AND now() >= discount.ends_at THEN 'EXPIRED'
      ELSE 'ACTIVE'
    END
  )::"pricing"."discount_effective_status" AS effective_status,
  discount.title,
  code_stats.primary_code,
  COALESCE(code_stats.codes_count, 0)::integer AS codes_count,
  discount.currency,
  discount.priority,
  discount.usage_limit,
  discount.applies_once_per_customer,
  discount.applies_on_one_time_purchase,
  discount.applies_on_subscription,
  discount.starts_at,
  discount.ends_at,
  discount.revision,
  COALESCE(usage_counter.reserved_count, 0)::bigint AS reserved_usage_count,
  (
    COALESCE(usage_counter.committed_count, 0)
    - COALESCE(usage_counter.reversed_count, 0)
  )::bigint AS usage_count,
  COALESCE(tags.tags, ARRAY[]::text[]) AS tags,
  COALESCE(channels.channel_codes, ARRAY[]::text[]) AS channel_codes,
  COALESCE(channels.featured_channel_codes, ARRAY[]::text[]) AS featured_channel_codes,
  EXISTS (
    SELECT 1
    FROM "pricing"."discount_combination_class" combination
    WHERE combination.discount_id = discount.id
      AND combination.combines_with_class = 'PRODUCT'
  ) AS combines_with_product_discounts,
  EXISTS (
    SELECT 1
    FROM "pricing"."discount_combination_class" combination
    WHERE combination.discount_id = discount.id
      AND combination.combines_with_class = 'ORDER'
  ) AS combines_with_order_discounts,
  EXISTS (
    SELECT 1
    FROM "pricing"."discount_combination_class" combination
    WHERE combination.discount_id = discount.id
      AND combination.combines_with_class = 'SHIPPING'
  ) AS combines_with_shipping_discounts,
  discount.created_by_id,
  discount.created_at,
  discount.updated_at,
  discount.archived_at
FROM "pricing"."discount" discount
LEFT JOIN "pricing"."discount_usage_counter" usage_counter
  ON usage_counter.store_id = discount.store_id
 AND usage_counter.discount_id = discount.id
LEFT JOIN LATERAL (
  SELECT
    count(*)::integer AS codes_count,
    (
      array_agg(
        code.code
        ORDER BY (code.status = 'ACTIVE') DESC, code.created_at, code.id
      )
    )[1] AS primary_code
  FROM "pricing"."discount_code" code
  WHERE code.store_id = discount.store_id
    AND code.discount_id = discount.id
) code_stats ON true
LEFT JOIN LATERAL (
  SELECT array_agg(tag.tag ORDER BY tag.normalized_tag)::text[] AS tags
  FROM "pricing"."discount_tag" tag
  WHERE tag.store_id = discount.store_id
    AND tag.discount_id = discount.id
) tags ON true
LEFT JOIN LATERAL (
  SELECT
    array_agg(channel.channel_code ORDER BY channel.channel_code)::text[] AS channel_codes,
    array_agg(channel.channel_code ORDER BY channel.channel_code)
      FILTER (WHERE channel.is_featured)::text[] AS featured_channel_codes
  FROM "pricing"."discount_channel" channel
  WHERE channel.store_id = discount.store_id
    AND channel.discount_id = discount.id
) channels ON true;

CREATE VIEW "pricing"."discount_configuration_view" AS
SELECT
  discount_list.*,
  amount_off.value_type AS amount_off_value_type,
  amount_off.percentage_bps AS amount_off_percentage_bps,
  amount_off.amount_minor AS amount_off_amount_minor,
  amount_off.allocation_method AS amount_off_allocation_method,
  amount_off.maximum_discount_minor,
  buy_x_get_y.requirement_type AS buy_requirement_type,
  buy_x_get_y.required_quantity AS buy_required_quantity,
  buy_x_get_y.required_subtotal_minor AS buy_required_subtotal_minor,
  buy_x_get_y.benefit_quantity,
  buy_x_get_y.benefit_value_type,
  buy_x_get_y.benefit_percentage_bps,
  buy_x_get_y.benefit_amount_minor,
  buy_x_get_y.uses_per_order_limit,
  free_shipping.maximum_shipping_price_minor,
  minimum_requirement.requirement_type AS minimum_requirement_type,
  minimum_requirement.subtotal_minor AS minimum_subtotal_minor,
  minimum_requirement.quantity AS minimum_quantity,
  buyer_context.context_type AS buyer_context_type,
  COALESCE(targets.target_selections, '[]'::jsonb) AS target_selections,
  COALESCE(eligible_customers.customer_ids, ARRAY[]::uuid[]) AS eligible_customer_ids,
  COALESCE(eligible_segments.segment_ids, ARRAY[]::uuid[]) AS eligible_segment_ids,
  COALESCE(codes.codes, '[]'::jsonb) AS codes,
  COALESCE(channels.channels, '[]'::jsonb) AS channels
FROM "pricing"."discount_list_view" discount_list
LEFT JOIN "pricing"."discount_amount_off" amount_off
  ON amount_off.store_id = discount_list.store_id
 AND amount_off.discount_id = discount_list.id
LEFT JOIN "pricing"."discount_buy_x_get_y" buy_x_get_y
  ON buy_x_get_y.store_id = discount_list.store_id
 AND buy_x_get_y.discount_id = discount_list.id
LEFT JOIN "pricing"."discount_free_shipping" free_shipping
  ON free_shipping.store_id = discount_list.store_id
 AND free_shipping.discount_id = discount_list.id
LEFT JOIN "pricing"."discount_minimum_requirement" minimum_requirement
  ON minimum_requirement.store_id = discount_list.store_id
 AND minimum_requirement.discount_id = discount_list.id
LEFT JOIN "pricing"."discount_buyer_context" buyer_context
  ON buyer_context.store_id = discount_list.store_id
 AND buyer_context.discount_id = discount_list.id
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'role', selection.role,
      'targetType', selection.target_type,
      'targetIds', COALESCE(selection_targets.target_ids, '[]'::jsonb)
    )
    ORDER BY selection.role
  ) AS target_selections
  FROM "pricing"."discount_target_selection" selection
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(target.target_id ORDER BY target.target_id) AS target_ids
    FROM "pricing"."discount_target" target
    WHERE target.store_id = selection.store_id
      AND target.discount_id = selection.discount_id
      AND target.role = selection.role
  ) selection_targets ON true
  WHERE selection.store_id = discount_list.store_id
    AND selection.discount_id = discount_list.id
) targets ON true
LEFT JOIN LATERAL (
  SELECT array_agg(customer.customer_id ORDER BY customer.customer_id) AS customer_ids
  FROM "pricing"."discount_eligible_customer" customer
  WHERE customer.store_id = discount_list.store_id
    AND customer.discount_id = discount_list.id
) eligible_customers ON true
LEFT JOIN LATERAL (
  SELECT array_agg(segment.segment_id ORDER BY segment.segment_id) AS segment_ids
  FROM "pricing"."discount_eligible_segment" segment
  WHERE segment.store_id = discount_list.store_id
    AND segment.discount_id = discount_list.id
) eligible_segments ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', code.id,
      'code', code.code,
      'status', code.status,
      'usageLimit', code.usage_limit
    )
    ORDER BY (code.status = 'ACTIVE') DESC, code.created_at, code.id
  ) AS codes
  FROM "pricing"."discount_code" code
  WHERE code.store_id = discount_list.store_id
    AND code.discount_id = discount_list.id
) codes ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'code', channel.channel_code,
      'featured', channel.is_featured
    )
    ORDER BY channel.channel_code
  ) AS channels
  FROM "pricing"."discount_channel" channel
  WHERE channel.store_id = discount_list.store_id
    AND channel.discount_id = discount_list.id
) channels ON true;
