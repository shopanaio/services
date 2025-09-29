import { ShippingPaymentModel, ProviderContext } from "@shopana/shipping-plugin-sdk";
export { ShippingPaymentModel };
/**
 * Payment flow strategy used by payment methods.
 * - ONLINE: customer pays online via provider (redirect/app handled externally).
 * - OFFLINE: customer pays offline (bank transfer/invoice); show instructions.
 * - ON_DELIVERY: customer pays on delivery (cash/card on delivery, pickup desk).
 */
export enum PaymentFlow {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  ON_DELIVERY = "ON_DELIVERY",
}

export type PaymentMethod = Readonly<{
  code: string;
  provider: string;
  name: string;
  description?: string;
  paymentModel: ShippingPaymentModel;
  flow: PaymentFlow;
  metadata?: Readonly<Record<string, unknown>>;
  constraints?: Readonly<{
    shippingProvider?: string;
    shippingMethodCodes?: string[];
  }>;
}>;

export type GetPaymentMethodsInput = Readonly<{
  shippingMethodCode?: string;
  amountMinor?: number;
  currency?: string;
  locale?: string;
}>;

export type ProviderPaymentApi = {
  getPaymentMethods?(input?: GetPaymentMethodsInput): Promise<PaymentMethod[]>;
};

export type PaymentCapability = "payment";

export type PaymentPluginManifest = Readonly<{
  code: string;
  displayName: string;
  description?: string;
  version: string;
  apiVersionRange: string;
  domains: string[]; // e.g., ['payment']
  capabilities?: PaymentCapability[]; // e.g., ['payment']
  priority?: number;
}>;

export type PaymentPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () => Promise<{ ok: boolean; details?: Record<string, unknown> }> | { ok: boolean; details?: Record<string, unknown> };
  onError: (e: unknown, meta: { operation: string }) => void;
  onTelemetry: (event: string, payload?: Record<string, unknown>) => void;
}>;

export type PaymentProvider = ProviderPaymentApi;

export type PaymentPlugin<TConfig = any> = Readonly<{
  manifest: PaymentPluginManifest;
  configSchema: import("zod").ZodType<TConfig>;
  hooks?: PaymentPluginHooks;
  migrations?: ReadonlyArray<{ from: string; to: string; migrate: (data: Record<string, unknown>) => Record<string, unknown> }>;
  create: (ctx: ProviderContext, config: TConfig) => PaymentProvider;
}>;

export type PaymentPluginModule<TConfig = any> = Readonly<{ plugin: PaymentPlugin<TConfig> }>;
