-- Up Migration
CREATE TYPE "payments"."provider_account_status" AS ENUM ('CONFIGURING', 'READY', 'ACTIVE', 'INACTIVE', 'DEGRADED', 'SUSPENDED');
CREATE TYPE "payments"."provider_mode" AS ENUM ('TEST', 'LIVE');
CREATE TYPE "payments"."capture_mode" AS ENUM ('AUTOMATIC', 'MANUAL');
CREATE TYPE "payments"."customization_status" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "payments"."customization_failure_mode" AS ENUM ('REQUIRED', 'OPTIONAL');
