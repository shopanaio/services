-- Up Migration

CREATE TYPE "catalog"."product_kind" AS ENUM (
  'BASE',
  'BUNDLE'
);

CREATE TYPE "catalog"."currency" AS ENUM (
  'UAH',
  'USD',
  'EUR'
);

CREATE TYPE "catalog"."dimension_unit" AS ENUM (
  'mm',
  'cm',
  'm',
  'in',
  'ft',
  'yd'
);

CREATE TYPE "catalog"."weight_unit" AS ENUM (
  'g',
  'kg',
  'lb',
  'oz'
);

CREATE TYPE "catalog"."stock_movement_type" AS ENUM (
  'SEED',
  'RECEIVE',
  'SELL',
  'RETURN',
  'ADJUST',
  'RESERVE',
  'RELEASE',
  'TRANSFER'
);

CREATE TYPE "catalog"."stock_movement_reason" AS ENUM (
  'DAMAGE',
  'INVENTORY_COUNT',
  'MANUAL',
  'CUSTOMER_RETURN'
);

CREATE TYPE "catalog"."stock_transfer_direction" AS ENUM (
  'IN',
  'OUT'
);

CREATE TYPE "catalog"."stock_apply_status" AS ENUM (
  'APPLIED',
  'REJECTED'
);

CREATE TYPE "catalog"."reservation_status" AS ENUM (
  'ACTIVE',
  'RELEASED',
  'FULFILLED'
);

CREATE TYPE "catalog"."bulk_edit_job_status" AS ENUM (
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "catalog"."bulk_edit_item_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'SUPERSEDED'
);

CREATE TYPE "catalog"."bulk_edit_cancel_reason" AS ENUM (
  'USER',
  'SUPERSEDED',
  'SYSTEM'
);
