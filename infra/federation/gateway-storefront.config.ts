import { defineConfig } from "@graphql-hive/gateway";
import { STOREFRONT_CONTEXT_HEADER } from "@shopana/shared-context";
import { createStorefrontAccessPlugin } from "./plugins/storefront-access/index.js";

const storefrontAccess = createStorefrontAccessPlugin();

export const gatewayConfig = defineConfig({
  // Storefront subscriptions are not exposed yet. Keeping the default
  // WebSocket server enabled would bypass the HTTP access plugin.
  disableWebsockets: true,
  maxTokens: 1_000,
  maxDepth: 12,
  blockFieldSuggestions: true,
  requestId: storefrontAccess.requestId,
  plugins: () => [storefrontAccess.plugin],
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      return {
        authorization: request.headers.get("authorization"),
        [STOREFRONT_CONTEXT_HEADER]: storefrontAccess.contextFor(request),
        "user-agent": request.headers.get("user-agent"),
        traceparent: request.headers.get("traceparent"),
        tracestate: request.headers.get("tracestate"),
      };
    },
  },
});
