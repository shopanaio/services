import { z } from "zod";
import type {
  NotificationChannel,
  NotificationDeliveryInput,
  NotificationDeliveryReceipt,
  NotificationProviderTestInput,
  NotificationProviderTestResult,
} from "@shopana/broker-types";
import type { HttpClient } from "./httpClient.js";
import type { ProviderContextLike } from "./providerContext.js";
import type { BasePluginManifest, ConfigMigration } from "./types.js";

export type {
  NotificationChannel,
  NotificationDeliveryInput,
  NotificationDeliveryReceipt,
  NotificationProviderTestInput,
  NotificationProviderTestResult,
} from "@shopana/broker-types";

export type ProviderContext = ProviderContextLike<HttpClient>;

export interface NotificationPluginManifest extends BasePluginManifest {
  domains: readonly ["notifications", ...string[]];
  notification: {
    channels: readonly NotificationChannel[];
    supportsIdempotencyKey: boolean;
    supportsBatch: boolean;
  };
}

export interface NotificationProvider {
  notifications: {
    deliver(
      input: NotificationDeliveryInput
    ): Promise<NotificationDeliveryReceipt>;
    testConnection?(
      input: NotificationProviderTestInput
    ): Promise<NotificationProviderTestResult>;
  };
}

export type NotificationProviderErrorKind =
  | "CONFIGURATION"
  | "AUTHENTICATION"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "TEMPORARY"
  | "PERMANENT"
  | "UNKNOWN";

export interface NotificationProviderErrorOptions {
  kind: NotificationProviderErrorKind;
  message: string;
  safeToRetry: boolean;
  acceptedByProvider?: boolean;
  retryAfterMs?: number;
  providerCode?: string;
}

export class NotificationProviderError extends Error {
  readonly kind: NotificationProviderErrorKind;
  readonly safeToRetry: boolean;
  readonly acceptedByProvider?: boolean;
  readonly retryAfterMs?: number;
  readonly providerCode?: string;

  constructor(options: NotificationProviderErrorOptions) {
    super(options.message);
    this.name = "NotificationProviderError";
    this.kind = options.kind;
    this.safeToRetry = options.safeToRetry;
    this.acceptedByProvider = options.acceptedByProvider;
    this.retryAfterMs = options.retryAfterMs;
    this.providerCode = options.providerCode;
  }
}

export type NotificationPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () =>
    | Promise<{ ok: boolean; details?: Record<string, unknown> }>
    | { ok: boolean; details?: Record<string, unknown> };
  onError: (error: unknown, meta: { operation: string }) => void;
  onTelemetry: (
    event: string,
    payload?: Record<string, unknown>
  ) => void;
}>;

export type NotificationPlugin<
  TConfig extends z.ZodTypeAny = z.ZodAny
> = Readonly<{
  manifest: NotificationPluginManifest;
  configSchema: TConfig;
  hooks?: NotificationPluginHooks;
  migrations?: ReadonlyArray<ConfigMigration>;
  create: (
    ctx: ProviderContext,
    config: z.infer<TConfig>
  ) => NotificationProvider;
}>;

export type PluginModule = Readonly<{ plugin: NotificationPlugin }>;
