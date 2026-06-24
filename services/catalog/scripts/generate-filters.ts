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
import { tagRelayQuery } from "../src/repositories/tag/TagRepository.js";
import { vendorRelayQuery } from "../src/repositories/vendor/VendorRepository.js";
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

const vendorFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  name: "String",
};

const vendorWhere = generateWhereInputType(vendorRelayQuery, "Vendor", {
  includeDescriptions: true,
  fieldTypes: vendorFieldTypes,
  excludeFields: ["projectId"],
});

const vendorOrderBy = generateOrderByInputType(vendorRelayQuery, "Vendor", {
  includeDescriptions: true,
  fieldTypes: vendorFieldTypes,
  excludeFields: ["projectId"],
});

const categoryListFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  parentId: "ID",
  path: "String",
  depth: "Int",
  handle: "String",
  defaultSort: "String",
  defaultSortDirection: "String",
  publishedAt: "DateTime",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  productsCount: "Int",
  locale: "String",
  name: "String",
};

const categoryWhere = generateWhereInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  fieldTypes: categoryListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const categoryOrderBy = generateOrderByInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  fieldTypes: categoryListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const tagListFieldTypes: Record<string, GraphQLFieldType> = {
  projectId: "ID",
  id: "ID",
  handle: "String",
  createdAt: "DateTime",
  productsCount: "Int",
  locale: "String",
  name: "String",
};

const tagWhere = generateWhereInputType(tagRelayQuery, "Tag", {
  includeDescriptions: true,
  fieldTypes: tagListFieldTypes,
});

const tagOrderBy = generateOrderByInputType(tagRelayQuery, "Tag", {
  includeDescriptions: true,
  fieldTypes: tagListFieldTypes,
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

# ---- Vendor ----

${vendorWhere}

${vendorOrderBy}

# ---- Category ----

${categoryWhere}

${categoryOrderBy}

# ---- Tag ----

${tagWhere}

${tagOrderBy}

# ---- CategoryProduct ----

${categoryProductWhere}

# ---- Variant ----

${variantWhere}

${variantOrderBy}
`;

writeFileSync("src/api/graphql-admin/schema/__generated__/filters.graphql", content);
console.log("✅ Generated filters.graphql");
