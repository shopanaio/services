CREATE INDEX IF NOT EXISTS "idx_category_project_path_prefix"
  ON "catalog"."category" ("project_id", "path" text_pattern_ops)
  WHERE "deleted_at" IS NULL;
