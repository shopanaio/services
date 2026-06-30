-- Up Migration

CREATE VIEW "catalog"."facet_tag_value_candidate_view" AS
SELECT
  'TAG:' || t.handle AS id,
  t.project_id,
  tt.locale,
  'TAG'::text AS facet_type,
  'tags'::text AS source_handle,
  t.handle::text AS handle,
  tt.name::text AS label
FROM "catalog"."tag" t
INNER JOIN "catalog"."tag_translation" tt
  ON tt.project_id = t.project_id
 AND tt.tag_id = t.id;

CREATE VIEW "catalog"."facet_option_value_candidate_view" AS
SELECT
  'OPTION:' || po.slug || ':' || pov.slug AS id,
  po.project_id,
  povt.locale,
  'OPTION'::text AS facet_type,
  po.slug::text AS source_handle,
  (po.slug || ':' || pov.slug)::text AS handle,
  MIN(povt.name)::text AS label
FROM "catalog"."product_option" po
INNER JOIN "catalog"."product_option_translation" pot
  ON pot.project_id = po.project_id
 AND pot.option_id = po.id
INNER JOIN "catalog"."product_option_value" pov
  ON pov.project_id = po.project_id
 AND pov.option_id = po.id
INNER JOIN "catalog"."product_option_value_translation" povt
  ON povt.project_id = pov.project_id
 AND povt.option_value_id = pov.id
 AND povt.locale = pot.locale
GROUP BY po.project_id, povt.locale, po.slug, pov.slug;

CREATE VIEW "catalog"."facet_feature_value_candidate_view" AS
SELECT
  'FEATURE:' || pf.slug || ':' || pfv.slug AS id,
  pf.project_id,
  pfvt.locale,
  'FEATURE'::text AS facet_type,
  pf.slug::text AS source_handle,
  (pf.slug || ':' || pfv.slug)::text AS handle,
  MIN(pfvt.name)::text AS label
FROM "catalog"."product_feature" pf
INNER JOIN "catalog"."product_feature_translation" pft
  ON pft.project_id = pf.project_id
 AND pft.feature_id = pf.id
INNER JOIN "catalog"."product_feature_value" pfv
  ON pfv.project_id = pf.project_id
 AND pfv.feature_id = pf.id
INNER JOIN "catalog"."product_feature_value_translation" pfvt
  ON pfvt.project_id = pfv.project_id
 AND pfvt.feature_value_id = pfv.id
 AND pfvt.locale = pft.locale
WHERE pf.is_group = false
GROUP BY pf.project_id, pfvt.locale, pf.slug, pfv.slug;
