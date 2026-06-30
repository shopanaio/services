-- Up Migration

CREATE VIEW "catalog"."variant_prices_current" AS
SELECT
  "id",
  "project_id",
  "variant_id",
  "currency",
  "amount_minor",
  "compare_at_minor",
  "effective_from",
  "effective_to",
  "recorded_at"
FROM "catalog"."item_pricing"
WHERE "effective_to" IS NULL;

CREATE VIEW "catalog"."variant_costs_current" AS
SELECT
  "id",
  "project_id",
  "variant_id",
  "currency",
  "unit_cost_minor",
  "effective_from",
  "effective_to",
  "recorded_at"
FROM "catalog"."product_variant_cost_history"
WHERE "effective_to" IS NULL;

CREATE VIEW "catalog"."product_price_range" AS
SELECT
  item_pricing.project_id,
  variant.product_id,
  item_pricing.currency,
  MIN(item_pricing.amount_minor) AS min_amount_minor,
  MAX(item_pricing.amount_minor) AS max_amount_minor
FROM "catalog"."item_pricing" item_pricing
INNER JOIN "catalog"."variant" variant
  ON variant.id = item_pricing.variant_id
 AND variant.deleted_at IS NULL
WHERE item_pricing.effective_to IS NULL
GROUP BY item_pricing.project_id, variant.product_id, item_pricing.currency;
