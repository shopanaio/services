import { defineConfig, loadGraphQLHTTPSubgraph } from "@graphql-mesh/compose-cli";

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph("apps-admin", {
        endpoint: "http://localhost:10001/graphql",
        source: "./schema/apps-admin.graphql",
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("inventory-admin", {
        endpoint: "http://localhost:10005/graphql",
        source: "./schema/inventory-admin.graphql",
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("media-admin", {
        endpoint: "http://localhost:10007/graphql",
        source: "./schema/media-admin.graphql",
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("orders-admin", {
        endpoint: "http://localhost:10003/graphql",
        source: "./schema/orders-admin.graphql",
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("project-admin", {
        endpoint: "http://localhost:10004/graphql",
        source: "./schema/project-admin.graphql",
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("users-admin", {
        endpoint: "http://localhost:10006/graphql",
        source: "./schema/users-admin.graphql",
      }),
    },
  ],
});
