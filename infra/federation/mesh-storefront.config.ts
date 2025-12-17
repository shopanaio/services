import { defineConfig, loadGraphQLHTTPSubgraph } from "@graphql-mesh/compose-cli";

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph("checkout-storefront", {
        endpoint: "http://localhost:10002/graphql",
        source: "./schema/checkout-storefront.graphql",
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("orders-storefront", {
        endpoint: "http://localhost:10003/graphql",
        source: "./schema/orders-storefront.graphql",
      }),
    },
  ],
});
