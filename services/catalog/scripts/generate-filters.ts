import { writeFileSync } from "fs";
import {
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import {
  categoryProductsRelayQuery,
  categoryRelayQuery,
} from "../src/repositories/category/CategoryRepository.js";
import { productRelayQuery } from "../src/repositories/product/ProductRepository.js";
import { variantRelayQuery } from "../src/repositories/variant/VariantRepository.js";

const productListFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  vendorId: "ID",
  handle: "String",
  publishedAt: "DateTime",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  locale: "String",
  name: "String",
  currency: "String",
  minPriceMinor: "Int",
  maxPriceMinor: "Int",
  primaryCategoryId: "ID",
  primaryCategoryName: "String",
};

const productWhere = generateWhereInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  fieldTypes: productListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const productOrderBy = generateOrderByInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  fieldTypes: productListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const categoryWhere = generateWhereInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision", "productsCount"],
});

const categoryOrderBy = generateOrderByInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision", "productsCount"],
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

# ---- Product ----

${productWhere}

${productOrderBy}

# ---- Category ----

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
