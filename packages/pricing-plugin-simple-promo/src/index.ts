import { z } from 'zod';
import type { PricingPlugin, ProviderContext } from '@shopana/plugin-sdk/pricing';
import { DiscountType } from '@shopana/plugin-sdk/pricing';
import { SimplePromoPricingProvider } from './provider';

export const configSchema = z.object({
  // Maximum number of returned discounts
  maxDiscounts: z.number().positive().optional().default(10),

  // Enabled discount types
  enabledTypes: z.array(z.nativeEnum(DiscountType)).optional(),

  // Return only active discounts
  onlyActiveDiscounts: z.boolean().optional().default(false),

  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
});

export const plugin: PricingPlugin<typeof configSchema> = {
  manifest: {
    code: 'simple-promo',
    displayName: 'Simple Promo Discounts',
    description: 'Simple promo discount provider for basic promotions',
    version: '1.0.0',
    apiVersionRange: '^1.0.0',
    domains: ['pricing'],
    priority: 100, // low priority, fallback
  },
  configSchema,
  hooks: {
    async init(ctx: ProviderContext) {
      ctx.logger.info('Simple promo pricing provider initialized');
    },
    async healthCheck() {
      return {
        ok: true,
        details: {
          provider: 'simple-promo',
          status: 'healthy',
          discountCount: 4
        }
      };
    },
    onTelemetry(event: string, payload?: Record<string, unknown>) {
      // In a real plugin, metrics would be sent here
      console.log(`[SimplePromo] Telemetry: ${event}`, payload);
    },
    onError(error: unknown, meta: { operation: string }) {
      console.error(`[SimplePromo] Error in ${meta.operation}:`, error);
    },
  },
  create(ctx: ProviderContext, cfg: z.infer<typeof configSchema>) {
    return new SimplePromoPricingProvider(ctx, cfg);
  },
};

export default { plugin };
