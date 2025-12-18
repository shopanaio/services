import { defineConfig } from "@graphql-mesh/compose-cli";
import { buildSubgraphs } from "./scripts/mesh-utils.js";

export const composeConfig = defineConfig({
  subgraphs: buildSubgraphs("storefront"),
});
