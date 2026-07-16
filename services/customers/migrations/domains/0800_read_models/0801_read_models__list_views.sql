-- Customer list read model used by Admin Relay pagination.
--
-- Monetary statistics produce one row per customer and currency. Repository
-- queries must scope this view to the current Store and requested currency.
CREATE VIEW "customers"."customer_list_view" AS
SELECT
  customer.store_id,
  customer.id,
  customer.iam_principal_id,
  customer.lifecycle_status,
  customer.account_status,
  customer.email,
  customer.normalized_email,
  customer.email_verified,
  customer.phone_e164,
  customer.phone_verified,
  customer.prefix,
  customer.first_name,
  customer.middle_name,
  customer.last_name,
  customer.suffix,
  customer.preferred_locale,
  customer.date_of_birth,
  customer.gender,
  customer.company_name,
  customer.job_title,
  customer.note,
  customer.blocked_reason,
  customer.moderation_note,
  customer.source,
  customer.created_by_user_id,
  customer.revision,
  customer.last_activity_at,
  customer.merged_into_customer_id,
  customer.created_at,
  customer.updated_at,
  customer.deleted_at,
  customer.redacted_at,

  COALESCE(
    NULLIF(
      btrim(
        concat_ws(
          ' ',
          customer.prefix,
          customer.first_name,
          customer.middle_name,
          customer.last_name,
          customer.suffix
        )
      ),
      ''
    ),
    NULLIF(btrim(customer.company_name), ''),
    customer.email,
    customer.phone_e164,
    'Customer'
  ) AS display_name,

  default_shipping_address.id AS default_shipping_address_id,
  default_shipping_address.city AS default_shipping_city,
  default_shipping_address.region_code AS default_shipping_region_code,
  default_shipping_address.country_code AS default_shipping_country_code,

  email_consent.state AS email_marketing_state,

  -- Admin "Orders" means completed orders. Preserve the total counter under
  -- a separate name for consumers that need all created orders.
  COALESCE(statistics.completed_orders_count, 0) AS orders_count,
  COALESCE(statistics.orders_count, 0) AS total_orders_count,
  COALESCE(statistics.completed_orders_count, 0) AS completed_orders_count,
  COALESCE(statistics.cancelled_orders_count, 0) AS cancelled_orders_count,
  COALESCE(statistics.returns_count, 0) AS returns_count,
  statistics.first_order_id,
  statistics.first_order_at,
  statistics.last_order_id,
  statistics.last_order_at,
  statistics.last_checkout_at,
  statistics.updated_at AS statistics_updated_at,

  monetary_statistics.currency_code,
  COALESCE(monetary_statistics.orders_count, 0) AS monetary_orders_count,
  COALESCE(monetary_statistics.total_spent_minor, 0) AS total_spent_minor,
  COALESCE(monetary_statistics.total_refunded_minor, 0) AS total_refunded_minor,
  COALESCE(monetary_statistics.net_spent_minor, 0) AS net_spent_minor,
  COALESCE(monetary_statistics.average_order_value_minor, 0) AS average_order_value_minor,
  monetary_statistics.updated_at AS monetary_statistics_updated_at
FROM "customers"."customer" customer
LEFT JOIN "customers"."customer_address" default_shipping_address
  ON default_shipping_address.store_id = customer.store_id
 AND default_shipping_address.customer_id = customer.id
 AND default_shipping_address.is_default_shipping = true
 AND default_shipping_address.deleted_at IS NULL
LEFT JOIN "customers"."customer_consent" email_consent
  ON email_consent.store_id = customer.store_id
 AND email_consent.customer_id = customer.id
 AND email_consent.channel = 'EMAIL'
LEFT JOIN "customers"."customer_statistics" statistics
  ON statistics.store_id = customer.store_id
 AND statistics.customer_id = customer.id
LEFT JOIN "customers"."customer_monetary_statistics" monetary_statistics
  ON monetary_statistics.store_id = customer.store_id
 AND monetary_statistics.customer_id = customer.id;

-- Segment list read model used for filtering and sorting by the number of
-- current members without multiplying segment rows in the Relay query.
CREATE VIEW "customers"."customer_segment_list_view" AS
SELECT
  segment.store_id,
  segment.id,
  segment.name,
  segment.description,
  segment.color,
  segment.type,
  segment.status,
  segment.query,
  segment.definition,
  segment.created_by_id,
  segment.revision,
  segment.created_at,
  segment.updated_at,
  segment.deleted_at,
  (
    SELECT count(*)::integer
    FROM "customers"."customer_segment_membership" membership
    INNER JOIN "customers"."customer" member_customer
      ON member_customer.store_id = membership.store_id
     AND member_customer.id = membership.customer_id
     AND member_customer.deleted_at IS NULL
    WHERE membership.store_id = segment.store_id
      AND membership.segment_id = segment.id
      AND (
        membership.expires_at IS NULL
        OR membership.expires_at > now()
      )
  ) AS customers_count
FROM "customers"."customer_segment" segment;
