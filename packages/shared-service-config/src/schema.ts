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

const BaseServiceSchema = z.object({
  ports: PortsConfigSchema.optional(),
  database: DatabaseConfigSchema.optional(),
  storage: StorageConfigSchema.optional(),
  graphql: GraphQLConfigSchema.optional(),
});

const UsersServiceSchema = BaseServiceSchema.extend({
  casdoor: CasdoorConfigSchema.optional(),
});

const BootstrapServiceSchema = z.object({
  services: z.array(z.string()),
  metrics_port: z.number().int().positive().optional(),
});

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
  services: z.object({
    bootstrap: BootstrapServiceSchema.optional(),
    apps: BaseServiceSchema,
    checkout: BaseServiceSchema,
    delivery: BaseServiceSchema,
    inventory: BaseServiceSchema,
    media: BaseServiceSchema,
    orders: BaseServiceSchema,
    payments: BaseServiceSchema,
    pricing: BaseServiceSchema,
    project: BaseServiceSchema,
    users: UsersServiceSchema,
  }),
});

// ═══════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════

export type Config = z.infer<typeof ConfigSchema>;
export type GlobalConfig = Config["global"];
export type ServicesConfig = Config["services"];
export type ServiceName = keyof ServicesConfig;

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type CasdoorConfig = z.infer<typeof CasdoorConfigSchema>;
export type PortsConfig = z.infer<typeof PortsConfigSchema>;
export type GraphQLConfig = z.infer<typeof GraphQLConfigSchema>;

// Service-specific configs
export type AppsConfig = ServicesConfig["apps"];
export type CheckoutConfig = ServicesConfig["checkout"];
export type DeliveryConfig = ServicesConfig["delivery"];
export type InventoryConfig = ServicesConfig["inventory"];
export type MediaConfig = ServicesConfig["media"];
export type OrdersConfig = ServicesConfig["orders"];
export type PaymentsConfig = ServicesConfig["payments"];
export type PricingConfig = ServicesConfig["pricing"];
export type ProjectConfig = ServicesConfig["project"];
export type UsersConfig = ServicesConfig["users"];
export type BootstrapConfig = ServicesConfig["bootstrap"];
