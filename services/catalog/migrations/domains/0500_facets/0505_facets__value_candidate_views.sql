-- Up Migration

CREATE VIEW "catalog"."facet_tag_value_candidate_view" AS
SELECT
  'TAG:' || t.handle AS id,
  t.store_id,
  tt.locale,
  'TAG'::text AS facet_type,
  'tags'::text AS source_handle,
  t.handle::text AS handle,
  tt.name::text AS label
FROM "catalog"."tag" t
INNER JOIN "catalog"."tag_translation" tt
  ON tt.store_id = t.store_id
 AND tt.tag_id = t.id;

CREATE VIEW "catalog"."facet_option_value_candidate_view" AS
SELECT
  'OPTION:' || po.slug || ':' || pov.slug AS id,
  po.store_id,
  povt.locale,
  'OPTION'::text AS facet_type,
  po.slug::text AS source_handle,
  (po.slug || ':' || pov.slug)::text AS handle,
  MIN(povt.name)::text AS label
FROM "catalog"."product_option" po
INNER JOIN "catalog"."product_option_translation" pot
  ON pot.store_id = po.store_id
 AND pot.option_id = po.id
INNER JOIN "catalog"."product_option_value" pov
  ON pov.store_id = po.store_id
 AND pov.option_id = po.id
INNER JOIN "catalog"."product_option_value_translation" povt
  ON povt.store_id = pov.store_id
 AND povt.option_value_id = pov.id
 AND povt.locale = pot.locale
GROUP BY po.store_id, povt.locale, po.slug, pov.slug;

CREATE VIEW "catalog"."facet_feature_value_candidate_view" AS
SELECT
  'FEATURE:' || pf.slug || ':' || pfv.slug AS id,
  pf.store_id,
  pfvt.locale,
  'FEATURE'::text AS facet_type,
  pf.slug::text AS source_handle,
  (pf.slug || ':' || pfv.slug)::text AS handle,
  MIN(pfvt.name)::text AS label
FROM "catalog"."product_feature" pf
INNER JOIN "catalog"."product_feature_translation" pft
  ON pft.store_id = pf.store_id
 AND pft.feature_id = pf.id
INNER JOIN "catalog"."product_feature_value" pfv
  ON pfv.store_id = pf.store_id
 AND pfv.feature_id = pf.id
INNER JOIN "catalog"."product_feature_value_translation" pfvt
  ON pfvt.store_id = pfv.store_id
 AND pfvt.feature_value_id = pfv.id
 AND pfvt.locale = pft.locale
WHERE pf.is_group = false
GROUP BY pf.store_id, pfvt.locale, pf.slug, pfv.slug;
