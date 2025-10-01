import { z } from "zod";
import type { PaymentPlugin } from "@shopana/plugin-sdk/payment";
import { PaymentFlow } from "@shopana/plugin-sdk/payment";
import type { ProviderContext } from "@shopana/plugin-sdk/payment";
import { BankTransferPaymentProvider } from "./provider";

export const configSchema = z.object({
  /** Supported currencies */
  supportedCurrencies: z
    .array(z.string())
    .optional()
    .default(["USD", "EUR", "UAH"]),
});

export const plugin: PaymentPlugin = {
  manifest: {
    code: "bank_transfer",
    displayName: "Bank Transfer",
    description: "Offline bank transfer payment method",
    version: "1.0.0",
    apiVersionRange: "^1.0.0",
    domains: ["payment"],
    priority: 50,
  },
  configSchema: configSchema as any,
  hooks: {
    async init(ctx: ProviderContext) {
      ctx.logger.info("Bank Transfer payment provider initialized");
    },
    async healthCheck() {
      return {
        ok: true,
        details: {
          provider: "bank_transfer",
          status: "healthy",
          paymentFlow: PaymentFlow.OFFLINE,
        },
      };
    },
    onTelemetry(event: string, payload?: Record<string, unknown>) {
      console.log(`[BankTransfer] Telemetry: ${event}`, payload);
    },
    onError(error: unknown, meta: { operation: string }) {
      console.error(`[BankTransfer] Error in ${meta.operation}:`, error);
    },
  },
  create(ctx: ProviderContext, cfg: z.infer<typeof configSchema>) {
    return new BankTransferPaymentProvider(ctx, cfg);
  },
};

export default { plugin };
