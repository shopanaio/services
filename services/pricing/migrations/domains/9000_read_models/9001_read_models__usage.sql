-- Up Migration

CREATE VIEW "pricing"."discount_usage_summary_view" AS
SELECT
  discount.store_id,
  discount.id AS discount_id,
  discount.usage_limit,
  COALESCE(counter.reserved_count, 0)::bigint AS reserved_count,
  COALESCE(counter.committed_count, 0)::bigint AS committed_count,
  COALESCE(counter.reversed_count, 0)::bigint AS reversed_count,
  (
    COALESCE(counter.committed_count, 0)
    - COALESCE(counter.reversed_count, 0)
  )::bigint AS net_committed_count,
  (
    COALESCE(counter.reserved_count, 0)
    + COALESCE(counter.committed_count, 0)
    - COALESCE(counter.reversed_count, 0)
  )::bigint AS consumed_count,
  CASE
    WHEN discount.usage_limit IS NULL THEN NULL
    ELSE GREATEST(
      discount.usage_limit
      - COALESCE(counter.reserved_count, 0)
      - COALESCE(counter.committed_count, 0)
      + COALESCE(counter.reversed_count, 0),
      0
    )::bigint
  END AS remaining_count,
  counter.version,
  counter.updated_at
FROM "pricing"."discount" discount
LEFT JOIN "pricing"."discount_usage_counter" counter
  ON counter.store_id = discount.store_id
 AND counter.discount_id = discount.id;

CREATE VIEW "pricing"."discount_code_list_view" AS
SELECT
  code.store_id,
  code.id,
  code.discount_id,
  code.code,
  code.normalized_code,
  code.status,
  code.usage_limit,
  COALESCE(counter.reserved_count, 0)::bigint AS reserved_count,
  COALESCE(counter.committed_count, 0)::bigint AS committed_count,
  COALESCE(counter.reversed_count, 0)::bigint AS reversed_count,
  (
    COALESCE(counter.committed_count, 0)
    - COALESCE(counter.reversed_count, 0)
  )::bigint AS usage_count,
  CASE
    WHEN code.usage_limit IS NULL THEN NULL
    ELSE GREATEST(
      code.usage_limit
      - COALESCE(counter.reserved_count, 0)
      - COALESCE(counter.committed_count, 0)
      + COALESCE(counter.reversed_count, 0),
      0
    )::bigint
  END AS remaining_count,
  code.metadata,
  code.created_at,
  code.updated_at,
  code.disabled_at
FROM "pricing"."discount_code" code
LEFT JOIN "pricing"."discount_code_usage_counter" counter
  ON counter.store_id = code.store_id
 AND counter.discount_id = code.discount_id
 AND counter.code_id = code.id;
