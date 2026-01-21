-- Drop the related column from domain_events
DROP INDEX IF EXISTS idx_events_related;
ALTER TABLE domain_events DROP COLUMN IF EXISTS related;
