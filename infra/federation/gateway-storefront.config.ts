import { defineConfig } from "@graphql-hive/gateway";
import { REQUEST_TIMESTAMP_HEADER, STOREFRONT_CONTEXT_HEADER } from "@shopana/shared-context";
import { createStorefrontAccessPlugin } from "./plugins/storefront-access/index.js";

const storefrontAccess = createStorefrontAccessPlugin();

export const gatewayConfig = defineConfig({
  disableWebsockets: false,
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
        [REQUEST_TIMESTAMP_HEADER]: storefrontAccess.requestTimestampFor(request),
        "user-agent": request.headers.get("user-agent"),
        traceparent: request.headers.get("traceparent"),
        tracestate: request.headers.get("tracestate"),
      };
    },
  },
});
