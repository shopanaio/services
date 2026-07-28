-- Up Migration

CREATE VIEW "apps"."app_list_view" AS
SELECT
  catalog.store_id,
  catalog.app_code AS code,
  catalog.version,
  catalog.display_name,
  catalog.capabilities,
  COALESCE(installation.status::text, 'UNINSTALLED') AS status,
  (installation.id IS NOT NULL) AS installed,
  installation.id AS installation_id,
  GREATEST(
    catalog.updated_at,
    COALESCE(installation.updated_at, catalog.updated_at)
  ) AS updated_at
FROM "apps"."app_catalog" catalog
LEFT JOIN LATERAL (
  SELECT
    candidate.id,
    candidate.status,
    candidate.updated_at
  FROM "apps"."app_installations" candidate
  WHERE candidate.store_id = catalog.store_id
    AND candidate.app_code = catalog.app_code
    AND candidate.status <> 'UNINSTALLED'
  ORDER BY candidate.created_at DESC, candidate.id DESC
  LIMIT 1
) installation ON true;
