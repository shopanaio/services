export const BUILD_SERVICE_NAMES = [
  "apps",
  "bootstrap",
  "catalog",
  "checkout",
  "customers",
  "delivery",
  "events",
  "iam",
  "listing",
  "media",
  "notifications",
  "orders",
  "payments",
  "pricing",
  "project",
  "reviews",
] as const;

export const CODEGEN_SERVICE_NAMES = [
  "apps",
  "catalog",
  "checkout",
  "customers",
  "iam",
  "listing",
  "media",
  "notifications",
  "orders",
  "pricing",
  "project",
  "reviews",
] as const;

export const MIGRATION_SERVICE_NAMES = [
  "apps",
  "catalog",
  "customers",
  "delivery",
  "events",
  "iam",
  "listing",
  "media",
  "notifications",
  "pricing",
  "project",
  "reviews",
] as const;

export const DB_GENERATE_SERVICE_NAMES = [
  "apps",
  "events",
  "iam",
  "media",
  "project",
] as const;

export const formatServiceNames = (names: readonly string[]): string =>
  names.join(", ");
