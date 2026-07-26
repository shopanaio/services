import { defineConfig } from "@graphql-hive/gateway";
import { createStorefrontAccessPlugin } from "./plugins/storefront-access/index.js";

const storefrontAccess = createStorefrontAccessPlugin();

export const gatewayConfig = defineConfig({
  maxTokens: 1_000,
  maxDepth: 12,
  blockFieldSuggestions: true,
  plugins: () => [storefrontAccess.plugin],
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      return {
        authorization: request.headers.get("authorization"),
        "x-shopana-storefront-context":
          storefrontAccess.contextFor(request),
        "user-agent": request.headers.get("user-agent"),
        "x-request-id": request.headers.get("x-request-id"),
        traceparent: request.headers.get("traceparent"),
        tracestate: request.headers.get("tracestate"),
      };
    },
  },
});
