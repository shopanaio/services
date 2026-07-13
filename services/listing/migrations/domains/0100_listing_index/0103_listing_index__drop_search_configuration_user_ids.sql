ALTER TABLE listing.search_synonym_group
  DROP CONSTRAINT IF EXISTS chk_search_synonym_group_uuid_v7,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

ALTER TABLE listing.search_synonym_group
  ADD CONSTRAINT chk_search_synonym_group_uuid_v7
  CHECK (
    substring(store_id::text FROM 15 FOR 1) = '7'
    AND substring(group_id::text FROM 15 FOR 1) = '7'
  );

ALTER TABLE listing.search_product_boost
  DROP CONSTRAINT IF EXISTS chk_search_product_boost_uuid_v7,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

ALTER TABLE listing.search_product_boost
  ADD CONSTRAINT chk_search_product_boost_uuid_v7
  CHECK (
    substring(store_id::text FROM 15 FOR 1) = '7'
    AND substring(boost_id::text FROM 15 FOR 1) = '7'
  );
