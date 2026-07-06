-- Up Migration

ALTER TABLE "listing"."facet_source"
  ADD CONSTRAINT "facet_source_type_check"
  CHECK ("facet_type" IN ('OPTION', 'FEATURE'));
