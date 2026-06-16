import { writeFileSync } from "fs";
import { generateWhereInputType } from "@shopana/drizzle-query";
import { categoryProductsRelayQuery } from "../src/repositories/category/CategoryRepository.js";

const categoryProductWhere = generateWhereInputType(categoryProductsRelayQuery, "CategoryProduct", {
  includeDescriptions: true,
  excludeFields: ["projectId", "category"],
});

const content = `# Auto-generated GraphQL filter types for Catalog service.
# Do not edit manually. Run: yarn generate:filters

${categoryProductWhere}
`;

writeFileSync("src/api/graphql-admin/schema/__generated__/filters.graphql", content);
console.log("✅ Generated filters.graphql");
