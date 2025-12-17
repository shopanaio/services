import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════
// SHARED SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const DatabaseConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  user: z.string(),
  password: z.string(),
  database: z.string(),
  schema: z.string().nullable().optional(),
});

// Base storage schema (bucket optional for shared templates)
const BaseStorageConfigSchema = z.object({
  endpoint: z.string(),
  access_key: z.string(),
  secret_key: z.string(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  path_style: z.boolean().optional(),
});

// Service storage schema (bucket required)
export const StorageConfigSchema = BaseStorageConfigSchema.extend({
  bucket: z.string(),
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
// SERVICE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

// Universal service schema - accepts any service configuration
export const ServiceConfigSchema = z
  .object({
    // Common service fields
    ports: PortsConfigSchema.optional(),
    database: DatabaseConfigSchema.optional(),
    storage: StorageConfigSchema.optional(),
    graphql: GraphQLConfigSchema.optional(),
    // Service-specific fields
    casdoor: CasdoorConfigSchema.optional(),
    // Bootstrap-specific fields
    services: z.array(z.string()).optional(),
    metrics_port: z.number().int().positive().optional(),
  })
  .passthrough(); // Allow additional fields for future extensibility

// ═══════════════════════════════════════════════════════════════════
// FULL CONFIG SCHEMA
// ═══════════════════════════════════════════════════════════════════

export const ConfigSchema = z.object({
  global: z.object({
    environment: z.enum(["development", "staging", "production"]),
    log_level: z.enum(["debug", "info", "warn", "error"]),
    moleculer_transporter: z.string().optional(),
    platform_grpc_host: z.string().optional(),
  }),
  shared: z
    .object({
      database: z.object({ default: DatabaseConfigSchema }).optional(),
      storage: z.object({ default: BaseStorageConfigSchema }).optional(),
    })
    .optional(),
  // Dynamic services - any service name is allowed
  services: z.record(z.string(), ServiceConfigSchema),
});

// ═══════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════

export type Config = z.infer<typeof ConfigSchema>;
export type GlobalConfig = Config["global"];
export type ServicesConfig = Config["services"];
export type ServiceName = string;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type CasdoorConfig = z.infer<typeof CasdoorConfigSchema>;
export type PortsConfig = z.infer<typeof PortsConfigSchema>;
export type GraphQLConfig = z.infer<typeof GraphQLConfigSchema>;
