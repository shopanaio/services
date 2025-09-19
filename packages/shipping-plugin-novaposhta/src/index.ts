import { z } from 'zod';
import type { ShippingPlugin } from '@shopana/shipping-plugin-sdk';
import { NovaPoshtaProvider } from './provider';

const IS_MOCK = process.env.SHIPPING_NOVAPOSHTA_MOCK_METHODS === '1';

export const configSchema = z.object({
  baseUrl: IS_MOCK ? z.string().default('https://mock.novaposhta.local') : z.string().url(),
  apiKey: IS_MOCK ? z.string().default('mock') : z.string().min(1),
  defaultCurrency: z.string().optional(),
  senderCityRef: IS_MOCK ? z.string().default('00000000-0000-0000-0000-000000000000') : z.string().uuid(),
  recipientCityRef: (IS_MOCK ? z.string().default('00000000-0000-0000-0000-000000000000') : z.string().uuid()).optional(),
  defaultWeightKg: z.number().positive().default(1),
  defaultCost: z.number().nonnegative().default(1000),
  serviceTypes: z.array(z.string()).optional(),
});

export const plugin: ShippingPlugin<typeof configSchema> = {
  manifest: {
    code: 'novaposhta',
    displayName: 'Nova Poshta',
    description: 'Integration with Ukrainian delivery service Nova Poshta',
    version: '0.1.0',
    apiVersionRange: '^1.0.0',
    domains: ['shipping'],
    capabilities: ['rates'],
    priority: 10,
  },
  configSchema,
  hooks: {
    async healthCheck() { return { ok: true }; },
  },
  create(ctx, cfg) {
    return new NovaPoshtaProvider(ctx, cfg);
  },
};

export default { plugin };
