import type {
  CorePlugin,
  ProviderContextLike,
  HttpClient,
} from "@shopana/plugin-sdk";
import { configSchema, type TildaImportConfig } from "./config";
import { TildaImportProvider } from "./provider";

type ProviderContext = ProviderContextLike<HttpClient>;

export const plugin: CorePlugin<
  TildaImportConfig,
  ProviderContext,
  TildaImportProvider
> = {
  manifest: {
    code: "tilda",
    displayName: "Tilda Feed Import",
    description:
      "Imports Facebook-compatible CSV feeds from Tilda and computes stable hashes",
    version: "0.0.1",
    apiVersionRange: "^1.0.0",
    domains: ["import"],
    priority: 20,
  },
  configSchema,
  hooks: {
    async init(ctx) {
      ctx.logger.info(
        { provider: "tilda" },
        "Tilda import plugin initialized"
      );
    },
    async healthCheck() {
      return {
        ok: true,
        details: {
          provider: "tilda",
        },
      };
    },
  },
  create(ctx, cfg) {
    return new TildaImportProvider(ctx, cfg);
  },
};
