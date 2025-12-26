import { defineConfig } from "@graphql-hive/gateway";

export const gatewayConfig = defineConfig({
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      return {
        authorization: request.headers.get("authorization"),
        "x-store-name": request.headers.get("x-store-name"),
        "x-organization-id": request.headers.get("x-organization-id"),
        "x-api-key": request.headers.get("x-api-key"),
      };
    },
  },
});
