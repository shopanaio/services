import { defineConfig } from "@graphql-hive/gateway";
import { ADMIN_CONTEXT_HEADER } from "@shopana/shared-context";
import { createAdminContextPlugin } from "./plugins/admin-context/index.js";

const adminContext = createAdminContextPlugin();

export const gatewayConfig = defineConfig({
  requestId: adminContext.requestId,
  plugins: () => [adminContext.plugin],
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      return {
        authorization: request.headers.get("authorization"),
        [ADMIN_CONTEXT_HEADER]: adminContext.contextFor(request),
        "x-store-name": request.headers.get("x-store-name"),
        "user-agent": request.headers.get("user-agent"),
        "x-request-id": request.headers.get("x-request-id"),
        traceparent: request.headers.get("traceparent"),
        tracestate: request.headers.get("tracestate"),
      };
    },
  },
});
