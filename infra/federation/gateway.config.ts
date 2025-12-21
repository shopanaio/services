import { defineConfig } from "@graphql-hive/gateway";

export const gatewayConfig = defineConfig({
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      return {
        authorization: request.headers.get("authorization"),
        "x-project-name": request.headers.get("x-project-name"),
        "x-api-key": request.headers.get("x-api-key"),
      };
    },
  },
});
