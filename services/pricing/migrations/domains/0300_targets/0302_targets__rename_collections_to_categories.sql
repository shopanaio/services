-- Up Migration

ALTER TYPE "pricing"."discount_target_type"
  RENAME VALUE 'COLLECTIONS' TO 'CATEGORIES';
