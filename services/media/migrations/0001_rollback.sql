-- Rollback for Media Service Schema

DROP TABLE IF EXISTS media.bucket_rotation_log;
DROP TABLE IF EXISTS media.upload_sessions;
DROP TABLE IF EXISTS media.external_media;
DROP TABLE IF EXISTS media.s3_objects;
DROP TABLE IF EXISTS media.files;
DROP TABLE IF EXISTS media.buckets;

DROP SCHEMA IF EXISTS media;
