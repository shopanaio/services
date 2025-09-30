import { z } from 'zod';
import type { PaymentPlugin } from '@shopana/plugin-sdk/payment';
import { PaymentFlow } from '@shopana/plugin-sdk/payment';
import type { ProviderContext } from '@shopana/plugin-sdk/payment';
import { BankTransferPaymentProvider } from './provider';

export const configSchema = z.object({
  /** Bank name */
  bankName: z.string().min(1),

  /** Bank account holder name */
  accountHolder: z.string().min(1),

  /** Bank account number */
  accountNumber: z.string().min(1),

  /** Bank routing number / IBAN */
  routingNumber: z.string().min(1),

  /** Additional payment instructions */
  instructions: z.string().optional(),

  /** Payment reference format template */
  referenceTemplate: z.string().optional().default("ORDER-{orderId}"),

  /** Supported currencies */
  supportedCurrencies: z.array(z.string()).optional().default(["USD", "EUR", "UAH"]),

  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
});

export const plugin: PaymentPlugin = {
  manifest: {
    code: 'bank-transfer',
    displayName: 'Bank Transfer',
    description: 'Offline bank transfer payment method',
    version: '1.0.0',
    apiVersionRange: '^1.0.0',
    domains: ['payment'],
    priority: 50, // medium priority
  },
  configSchema: configSchema as any,
  hooks: {
    async init(ctx: ProviderContext) {
      ctx.logger.info('Bank Transfer payment provider initialized');
    },
    async healthCheck() {
      return {
        ok: true,
        details: {
          provider: 'bank-transfer',
          status: 'healthy',
          paymentFlow: PaymentFlow.OFFLINE
        }
      };
    },
    onTelemetry(event: string, payload?: Record<string, unknown>) {
      // В реальном плагине здесь бы отправлялись метрики
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
