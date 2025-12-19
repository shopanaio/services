import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════
// HELPER SCHEMAS (for use in services, not for validation)
// ═══════════════════════════════════════════════════════════════════

export const DbConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  user: z.string(),
  password: z.string(),
  database: z.string(),
  schema: z.string().nullable().optional(),
});

export const S3ConfigSchema = z.object({
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

export const WorkflowsConfigSchema = z.object({
  database_url: z.string(),
  app_name: z.string().optional(),
  schema: z.string().optional(), // PostgreSQL schema for DBOS system tables (default: "dbos")
});

export const PortsConfigSchema = z.record(
  z.string(),
  z.number().int().positive()
);

// ═══════════════════════════════════════════════════════════════════
// BASE SERVICE SCHEMA (like docker-compose service definition)
// ═══════════════════════════════════════════════════════════════════

export const BaseServiceSchema = z.object({
  ports: PortsConfigSchema.optional(),
  db: DbConfigSchema.optional(),
  s3: S3ConfigSchema.optional(),
  casdoor: CasdoorConfigSchema.optional(),
  workflows: WorkflowsConfigSchema.optional(),
});

// Service config extends base with additional custom fields
export const ServiceConfigSchema = BaseServiceSchema.passthrough();

// ═══════════════════════════════════════════════════════════════════
// CONFIG SCHEMA
// ═══════════════════════════════════════════════════════════════════

export const ConfigSchema = z.object({
  global: z
    .object({
      environment: z.enum(["development", "staging", "production"]),
      log_level: z.enum(["debug", "info", "warn", "error"]),
    })
    .passthrough(), // Allow additional properties
  shared: z.record(z.string(), z.unknown()).optional(),
  services: z.record(z.string(), ServiceConfigSchema),
  workflows: WorkflowsConfigSchema.optional(),
});

// ═══════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════

export type Config = z.infer<typeof ConfigSchema>;
export type GlobalConfig = Config["global"] & Record<string, unknown>;
export type ServicesConfig = Config["services"];
export type ServiceName = string;

// Base service type with common fields
export type BaseService = z.infer<typeof BaseServiceSchema>;

// Service config extends base with additional custom fields
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export type DbConfig = z.infer<typeof DbConfigSchema>;
export type S3Config = z.infer<typeof S3ConfigSchema>;
export type CasdoorConfig = z.infer<typeof CasdoorConfigSchema>;
export type WorkflowsConfig = z.infer<typeof WorkflowsConfigSchema>;
export type PortsConfig = z.infer<typeof PortsConfigSchema>;
