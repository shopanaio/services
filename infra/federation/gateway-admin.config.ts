import { defineConfig } from "@graphql-hive/gateway";

export const gatewayConfig = defineConfig({
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      return {
        authorization: request.headers.get("authorization"),
        "x-store-name": request.headers.get("x-store-name"),
        "x-organization-id": request.headers.get("x-organization-id"),
        "user-agent": request.headers.get("user-agent"),
        "x-request-id": request.headers.get("x-request-id"),
        traceparent: request.headers.get("traceparent"),
        tracestate: request.headers.get("tracestate"),
      };
    },
  },
});
