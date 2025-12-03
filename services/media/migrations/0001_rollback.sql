-- Rollback for Media Service Schema

DROP TABLE IF EXISTS bucket_rotation_log;
DROP TABLE IF EXISTS upload_sessions;
DROP TABLE IF EXISTS external_media;
DROP TABLE IF EXISTS s3_objects;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS buckets;

