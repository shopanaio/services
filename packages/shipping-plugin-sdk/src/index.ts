import { z } from "zod";

export enum DeliveryMethodType {
  SHIPPING = "SHIPPING",
  PICKUP = "PICKUP",
  NONE = "NONE",
}

export enum ShippingPaymentModel {
  MERCHANT_COLLECTED = "MERCHANT_COLLECTED",
  CARRIER_DIRECT = "CARRIER_DIRECT",
}

/**
 * Core API version of plugin contracts.
 *
 * Used by plugin manager to check plugin compatibility with core
 * by semver range {@link ShippingPluginManifest.apiVersionRange}.
 *
 * @public
 */
export const CORE_API_VERSION = "1.0.0";

/**
 * Unified shipping method DTO.
 *
 * @deprecated Use {@link ShippingMethod} for main contract.
 * @internal
 */
export type ShippingMethodDto = Readonly<{
  id: string;
  code: string;
  name: string;
  description?: string;
  provider: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

/**
 * Shipping method - main data type for shipping plugins.
 *
 * @property id — Unique method identifier within provider.
 * @property code — Method code (stable machine identifier).
 * @property name — Human-readable method name.
 * @property description — Additional description (optional).
 * @property provider — Code of provider that generated method (see {@link ShippingPluginManifest.code}).
 *
 * @public
 */
export type ShippingMethod = Readonly<{
  code: string;
  provider: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
}>;

/**
 * Additional JSON request settings for {@link HttpClient}.
 *
 * @remarks
 * - `timeoutMs` limits response wait time on client side.
 * - Additional headers are merged with default headers.
 * - Type is based on standard `RequestInit` Web Fetch API.
 *
 * @internal
 */
type JsonInit = RequestInit & {
  timeoutMs?: number;
  headers?: Record<string, string>;
};

/**
 * Unified HTTP client for plugins, oriented on JSON.
 *
 * @remarks
 * - Client should automatically serialize request body to JSON for `post/put`
 *   and set `Content-Type: application/json`.
 * - Retry and resilience behavior is provided by external Runner; client
 *   should not perform its own retries.
 * - Return type — standard `Response` from Web Fetch API (Node 18+).
 *
 * @public
 */
export type HttpClient = {
  get(path: string, init?: JsonInit): Promise<Response>;
  post(path: string, body?: unknown, init?: JsonInit): Promise<Response>;
  put(path: string, body?: unknown, init?: JsonInit): Promise<Response>;
  delete(path: string, init?: JsonInit): Promise<Response>;
};

/**
 * Context passed to plugin when creating provider.
 *
 * @property logger — Unified logger for informational messages, warnings and errors.
 * @property createHttp — HTTP client factory for provider base URL.
 *
 * @remarks
 * - `createHttp` implementation should forward tracing headers (e.g.,
 *   `User-Agent`, `X-Request-Id`) and support `timeoutMs` parameter.
 * - Base URL should be secure (`https://`), SSRF protection on service side.
 *
 * @public
 */
export type ProviderContext = Readonly<{
  logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  createHttp: (
    baseUrl: string,
    init?: { apiKey?: string; defaultHeaders?: Record<string, string> }
  ) => HttpClient;
}>;

/**
 * Shipping provider contract created by plugin.
 *
 * @public
 */
export type ShippingProvider = {
  /**
   * Returns list of all available shipping methods offered by provider.
   * This list is usually static and doesn't depend on checkout context.
   */
  getMethods(): Promise<ShippingMethod[]>;
};

/**
 * Set of extensible plugin lifecycle hooks.
 *
 * @property init — One-time plugin initialization.
 * @property healthCheck — Lightweight plugin health check.
 * @property onError — Error notifications for observability/alerting.
 * @property onTelemetry — Custom events for metrics.
 *
 * @public
 */
export type ShippingPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () =>
    | Promise<{ ok: boolean; details?: Record<string, unknown> }>
    | { ok: boolean; details?: Record<string, unknown> };
  onError: (e: unknown, meta: { operation: string }) => void;
  onTelemetry: (event: string, payload?: Record<string, unknown>) => void;
}>;

/**
 * Plugin configuration migration between versions.
 *
 * @property from — Source config version.
 * @property to — Target config version.
 * @property migrate — Pure function for config transformation; should be idempotent.
 *
 * @public
 */
export type ConfigMigration = Readonly<{
  from: string;
  to: string;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}>;

/**
 * Shipping plugin manifest.
 *
 * @property code — Unique plugin code (e.g., `novaposhta`).
 * @property displayName — Name for UI/admin panel.
 * @property description — Human-readable description (optional).
 * @property version — Plugin version (semver).
 * @property apiVersionRange — Compatibility range with {@link CORE_API_VERSION} (semver range).
 * @property domains — Plugin application domains (e.g., `['shipping']`).
 * @property capabilities — Plugin capabilities (e.g., `['rates', 'tracking']`).
 * @property priority — Selection priority (lower number = higher priority).
 *
 * @public
 */
export type ShippingPluginManifest = Readonly<{
  code: string; // unique provider code, e.g. 'novaposhta', 'fedex'
  displayName: string;
  description?: string;
  version: string; // plugin version
  apiVersionRange: string; // semver range compatible with CORE_API_VERSION
  domains: string[]; // e.g. ['shipping']
  capabilities?: string[]; // e.g. ['rates', 'tracking']
  priority?: number; // lower number — higher priority
}>;

/**
 * Shipping plugin contract.
 *
 * @typeParam TConfig — Zod schema for plugin configuration.
 *
 * @property manifest — Plugin manifest.
 * @property configSchema — Configuration validation schema (Zod).
 * @property hooks — Optional lifecycle hooks.
 * @property migrations — Configuration migration sequence.
 * @property create — Provider factory, accepts context and validated config.
 *
 * @public
 */
export type ShippingPlugin<TConfig extends z.ZodTypeAny = z.ZodAny> = Readonly<{
  manifest: ShippingPluginManifest;
  configSchema: TConfig;
  hooks?: ShippingPluginHooks;
  migrations?: ConfigMigration[];
  create: (ctx: ProviderContext, config: z.infer<TConfig>) => ShippingProvider;
}>;

/**
 * Exported plugin module type.
 *
 * Expected that plugin package exports object of form `{ plugin }` by default
 * or via named export that satisfies this type.
 *
 * @public
 */
export type PluginModule = Readonly<{ plugin: ShippingPlugin }>;
