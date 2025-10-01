import { z } from "zod";
import type { ShippingPlugin } from "@shopana/plugin-sdk/shipping";
import { NovaPoshtaProvider } from "./provider";

export const configSchema = z.object({
  apiKey: z.string().optional().default(""),
});

export const plugin: ShippingPlugin<typeof configSchema> = {
  manifest: {
    code: "novaposhta",
    displayName: "Nova Poshta",
    description: "Integration with Ukrainian delivery service Nova Poshta",
    version: "0.1.0",
    apiVersionRange: "^1.0.0",
    domains: ["shipping", "payment"],
    priority: 10,
  },
  configSchema,
  hooks: {
    async healthCheck() {
      return { ok: true };
    },
  },
  create(ctx, cfg) {
    return new NovaPoshtaProvider(ctx, cfg);
  },
};

export default { plugin };
