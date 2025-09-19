import { z } from 'zod';
import type { InventoryPlugin } from '@shopana/inventory-plugin-sdk';
import { ShopanaInventoryProvider } from './provider';

export const configSchema = z.object({
  // Default currency
  defaultCurrency: z.string().default('USD'),

  // Request timeout (ms)
  requestTimeout: z.number().positive().default(5000),

  // Enable mock mode for testing
  mockMode: z.boolean().default(process.env.INVENTORY_MOCK_MODE === 'true'),

  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
});

export const plugin: InventoryPlugin<typeof configSchema> = {
  manifest: {
    code: 'shopana',
    displayName: 'Shopana Inventory',
    description: 'Integration with Core Apps GraphQL API for inventory data fetching',
    version: '0.1.0',
    apiVersionRange: '^1.0.0',
    domains: ['inventory'],
    capabilities: ['offers'],
    priority: 10,
  },
  configSchema,
  hooks: {
    async init(ctx) {
      ctx.logger.info('Shopana inventory provider initialized');
    },
    async healthCheck() {
      return {
        ok: true,
        details: {
          provider: 'shopana',
          status: 'healthy',
        }
      };
    },
    onTelemetry(event: string, payload?: Record<string, unknown>) {
      // In a real plugin, metrics would be sent here
      console.log(`[Shopana] Telemetry: ${event}`, payload);
    },
    onError(error: unknown, meta: { operation: string }) {
      console.error(`[Shopana] Error in ${meta.operation}:`, error);
    },
  },
  create(ctx, cfg) {
    return new ShopanaInventoryProvider(ctx, cfg);
  },
};

export default { plugin };
