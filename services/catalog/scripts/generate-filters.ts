import { writeFileSync } from "fs";
import {
  generateOrderByInputType,
  generateWhereInputType,
} from "@shopana/drizzle-query";
import {
  categoryProductsRelayQuery,
  categoryRelayQuery,
} from "../src/repositories/category/CategoryRepository.js";
import { variantRelayQuery } from "../src/repositories/variant/VariantRepository.js";

const categoryWhere = generateWhereInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const categoryOrderBy = generateOrderByInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const categoryProductWhere = generateWhereInputType(
  categoryProductsRelayQuery,
  "CategoryProduct",
  {
    includeDescriptions: true,
    excludeFields: ["projectId", "category", "translation", "priceRange"],
  }
);

const variantWhere = generateWhereInputType(variantRelayQuery, "Variant", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "sku"],
});

const variantOrderBy = generateOrderByInputType(variantRelayQuery, "Variant", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "sku"],
});

const content = `# Auto-generated GraphQL filter types for Catalog service.
# Do not edit manually. Run: yarn generate:filters

${categoryWhere}

${categoryOrderBy}

# ---- CategoryProduct ----

${categoryProductWhere}

# ---- Variant ----

${variantWhere}

${variantOrderBy}
`;

writeFileSync("src/api/graphql-admin/schema/__generated__/filters.graphql", content);
console.log("✅ Generated filters.graphql");
