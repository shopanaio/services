import { z } from "zod";
import type { ShippingPlugin } from "@shopana/plugin-sdk/shipping";
import { MeestExpressProvider } from "./provider";

export const configSchema = z.object({
  apiKey: z.string().optional().default(""),
});

export const plugin: ShippingPlugin<typeof configSchema> = {
  manifest: {
    code: "meest",
    displayName: "Meest Express",
    description: "Integration with Ukrainian delivery service Meest Express",
    version: "0.1.0",
    apiVersionRange: "^1.0.0",
    domains: ["shipping"],
    priority: 20,
  },
  configSchema,
  hooks: {
    async healthCheck() {
      return { ok: true };
    },
  },
  create(ctx, cfg) {
    return new MeestExpressProvider(ctx, cfg);
  },
};

export default { plugin };
