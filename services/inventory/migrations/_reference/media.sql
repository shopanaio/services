-- =============================================================================
-- INVENTORY SERVICE: VARIANT MEDIA
-- =============================================================================
--
-- Many-to-many relationship between variants and media files.
-- Media files are stored in a separate Media service, so file_id has no FK.
--
-- Design decisions:
-- - file_id is UUID referencing external Media service (no FK constraint)
-- - sort_index for ordering images in product gallery
-- - CASCADE delete on variant ensures cleanup when variant is removed
-- - project_id for multi-tenant isolation
-- =============================================================================

CREATE TABLE variant_media (
  project_id uuid NOT NULL,
  variant_id uuid NOT NULL REFERENCES variant(id) ON DELETE CASCADE,
  file_id uuid NOT NULL,  -- External reference to Media service (no FK)
  sort_index integer NOT NULL DEFAULT 0,

  PRIMARY KEY (variant_id, file_id)
);

-- Project isolation
CREATE INDEX idx_variant_media_project ON variant_media (project_id);

-- Get all media for a variant
CREATE INDEX idx_variant_media_variant ON variant_media (variant_id);

-- Find all variants using a file (for Media service callbacks)
CREATE INDEX idx_variant_media_file ON variant_media (file_id);

-- Ordered retrieval
CREATE INDEX idx_variant_media_sort ON variant_media (variant_id, sort_index);


-- =============================================================================
-- EXAMPLE QUERIES
-- =============================================================================

-- Get all media for a variant (ordered)
-- SELECT file_id, sort_index
-- FROM variant_media
-- WHERE variant_id = $1
-- ORDER BY sort_index;

-- Set media for variant (replace all)
-- DELETE FROM variant_media WHERE variant_id = $1;
-- INSERT INTO variant_media (project_id, variant_id, file_id, sort_index)
-- VALUES
--   ($1, $2, $3, 0),
--   ($1, $2, $4, 1),
--   ($1, $2, $5, 2);

-- Find variants using a specific file (for cleanup when file deleted)
-- SELECT variant_id FROM variant_media WHERE file_id = $1;

-- Reorder media
-- UPDATE variant_media SET sort_index = $3
-- WHERE variant_id = $1 AND file_id = $2;
