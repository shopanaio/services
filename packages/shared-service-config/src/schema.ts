import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════
// HELPER SCHEMAS (for use in services, not for validation)
// ═══════════════════════════════════════════════════════════════════

export const DatabaseConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  user: z.string(),
  password: z.string(),
  database: z.string(),
  schema: z.string().nullable().optional(),
});

export const StorageConfigSchema = z.object({
  endpoint: z.string(),
  access_key: z.string(),
  secret_key: z.string(),
  bucket: z.string(),
  region: z.string().optional(),
  path_style: z.boolean().optional(),
});

export const CasdoorConfigSchema = z.object({
  endpoint: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
  application_name: z.string(),
  organization_name: z.string(),
  certificate: z.string(),
  google_provider: z.string().optional(),
  oauth_redirect_uri: z.string().optional(),
});

export const PortsConfigSchema = z.object({
  admin_graphql: z.number().int().positive().optional(),
  storefront_graphql: z.number().int().positive().optional(),
  metrics: z.number().int().positive().optional(),
});

export const GraphQLConfigSchema = z.object({
  path: z.string(),
});

// ═══════════════════════════════════════════════════════════════════
// CONFIG SCHEMA
// ═══════════════════════════════════════════════════════════════════

// Service config is flexible - services validate their own requirements
export const ServiceConfigSchema = z.record(z.string(), z.unknown());

export const ConfigSchema = z.object({
  global: z
    .object({
      environment: z.enum(["development", "staging", "production"]),
      log_level: z.enum(["debug", "info", "warn", "error"]),
    })
    .passthrough(), // Allow additional properties
  shared: z.record(z.string(), z.unknown()).optional(),
  services: z.record(z.string(), ServiceConfigSchema),
});

// ═══════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════

export type Config = z.infer<typeof ConfigSchema>;
export type GlobalConfig = Config["global"] & Record<string, unknown>;
export type ServicesConfig = Config["services"];
export type ServiceName = string;
export type ServiceConfig = Record<string, unknown>;

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type CasdoorConfig = z.infer<typeof CasdoorConfigSchema>;
export type PortsConfig = z.infer<typeof PortsConfigSchema>;
export type GraphQLConfig = z.infer<typeof GraphQLConfigSchema>;
