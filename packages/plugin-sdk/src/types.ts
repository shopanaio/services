import { z } from 'zod';

/**
 * Logical plugin domains used across the platform.
 * @public
 */
export enum Domain {
  SHIPPING = 'shipping',
  PAYMENT = 'payment',
  PRICING = 'pricing',
}

/**
 * Core API version used by domain plugin contracts.
 *
 * Plugins must specify compatible semver range in their manifests.
 * @public
 */
export const CORE_API_VERSION = '1.0.0';

/**
 * Configuration migration step shared across domains.
 *
 * Migrations are applied sequentially from stored `configVersion` to current plugin version.
 * Function must be pure and idempotent.
 * @public
 */
export type ConfigMigration = Readonly<{
  from: string;
  to: string;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}>;

/**
 * Base manifest fields commonly used by domain manifests.
 *
 * Domain-specific manifests may extend or inline these fields; this type is provided
 * for convenience and consistency across domains.
 * @public
 */
export type BasePluginManifest = Readonly<{
  code: string;
  displayName: string;
  description?: string;
  version: string;
  apiVersionRange: string;
  domains: string[];
  priority?: number;
}>;

// Re-export zod types used generically in domain contracts for convenience
export type ZodSchema<T> = z.ZodType<T>;
