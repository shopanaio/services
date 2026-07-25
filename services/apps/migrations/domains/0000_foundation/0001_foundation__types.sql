-- Up Migration

CREATE TYPE "apps"."app_installation_status" AS ENUM (
  'PENDING_CONSENT',
  'INSTALLING',
  'ACTIVE',
  'INSTALL_FAILED',
  'SUSPENDING',
  'SUSPENDED',
  'RESUMING',
  'UPDATING',
  'UPDATE_FAILED',
  'UNINSTALLING',
  'UNINSTALLED',
  'UNINSTALL_FAILED'
);

CREATE TYPE "apps"."app_installation_health_status" AS ENUM (
  'UNKNOWN',
  'HEALTHY',
  'DEGRADED',
  'UNHEALTHY'
);

CREATE TYPE "apps"."app_lifecycle_operation_type" AS ENUM (
  'INSTALL',
  'UPDATE',
  'SUSPEND',
  'RESUME',
  'UNINSTALL'
);

CREATE TYPE "apps"."app_lifecycle_operation_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TYPE "apps"."slot_status" AS ENUM (
  'active',
  'inactive',
  'maintenance',
  'deprecated'
);

CREATE TYPE "apps"."slot_assignment_status" AS ENUM (
  'active',
  'disabled'
);
