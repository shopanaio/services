import { writeFileSync } from "fs";
import {
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { categoryRelayQuery } from "../src/repositories/category/CategoryRepository.js";
import { productRelayQuery } from "../src/repositories/product/ProductRepository.js";
import { tagRelayQuery } from "../src/repositories/tag/TagRepository.js";
import { vendorRelayQuery } from "../src/repositories/vendor/VendorRepository.js";
import { optionCategoryRelayQuery } from "../src/repositories/option-category/OptionCategoryRepository.js";
import { variantRelayQuery } from "../src/repositories/variant/VariantRepository.js";
import { warehouseRelayQuery } from "../src/repositories/warehouse/WarehouseRepository.js";
import { stockRelayQuery } from "../src/repositories/stock/StockRepository.js";
import {
  facetSourceCandidateRelayQuery,
  facetTagValueCandidateRelayQuery,
} from "../src/repositories/facet/FacetCandidateRepository.js";

function generateConnectionInputType(name: string): string {
  return `"""Relay-style pagination input for ${name}"""
input ${name}ConnectionInput {
  """Returns the first n items"""
  first: Int
  """Returns items after this cursor"""
  after: String
  """Returns the last n items"""
  last: Int
  """Returns items before this cursor"""
  before: String
  """Filter conditions"""
  where: ${name}WhereInput
  """Sort order"""
  orderBy: [${name}OrderByInput!]
}`;
}

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
  minAmountMinor: "Int",
  maxAmountMinor: "Int",
  minPriceMinor: "Int",
  maxPriceMinor: "Int",
  primaryCategoryId: "ID",
  primaryCategoryName: "String",
};

const productWhere = generateWhereInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  fieldTypes: productListFieldTypes,
  excludeFields: ["storeId", "deletedAt", "revision"],
});

const productOrderBy = generateOrderByInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  fieldTypes: productListFieldTypes,
  excludeFields: ["storeId", "deletedAt", "revision"],
});

const vendorFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  name: "String",
};

const vendorWhere = generateWhereInputType(vendorRelayQuery, "Vendor", {
  includeDescriptions: true,
  fieldTypes: vendorFieldTypes,
  excludeFields: ["storeId"],
});

const vendorOrderBy = generateOrderByInputType(vendorRelayQuery, "Vendor", {
  includeDescriptions: true,
  fieldTypes: vendorFieldTypes,
  excludeFields: ["storeId"],
});

const optionCategoryFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  name: "String",
  slug: "String",
  createdAt: "DateTime",
  updatedAt: "DateTime",
};

const optionCategoryWhere = generateWhereInputType(
  optionCategoryRelayQuery,
  "ProductOptionCategory",
  {
    includeDescriptions: true,
    fieldTypes: optionCategoryFieldTypes,
    excludeFields: ["storeId"],
  },
);

const optionCategoryOrderBy = generateOrderByInputType(
  optionCategoryRelayQuery,
  "ProductOptionCategory",
  {
    includeDescriptions: true,
    fieldTypes: optionCategoryFieldTypes,
    excludeFields: ["storeId"],
  },
);

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
  excludeFields: ["storeId", "deletedAt", "revision"],
});

const categoryOrderBy = generateOrderByInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  fieldTypes: categoryListFieldTypes,
  excludeFields: ["storeId", "deletedAt", "revision"],
});

const tagListFieldTypes: Record<string, GraphQLFieldType> = {
  storeId: "ID",
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

const warehouseWhere = generateWhereInputType(warehouseRelayQuery, "Warehouse", {
  includeDescriptions: true,
  excludeFields: ["storeId"],
});

const warehouseOrderBy = generateOrderByInputType(warehouseRelayQuery, "Warehouse", {
  includeDescriptions: true,
  excludeFields: ["storeId"],
});

const warehouseConnectionInput = generateConnectionInputType("Warehouse");

const warehouseStockWhere = generateWhereInputType(stockRelayQuery, "WarehouseStock", {
  includeDescriptions: true,
  excludeFields: ["storeId", "reservedQty", "unavailableQty"],
});

const warehouseStockOrderBy = generateOrderByInputType(stockRelayQuery, "WarehouseStock", {
  includeDescriptions: true,
  excludeFields: ["storeId", "reservedQty", "unavailableQty"],
});

const warehouseStockConnectionInput = generateConnectionInputType("WarehouseStock");

const variantWhere = generateWhereInputType(variantRelayQuery, "Variant", {
  includeDescriptions: true,
  excludeFields: ["storeId", "deletedAt", "sku"],
});

const variantOrderBy = generateOrderByInputType(variantRelayQuery, "Variant", {
  includeDescriptions: true,
  excludeFields: ["storeId", "deletedAt", "sku"],
});

const facetSourceCandidateFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  facetType: "String",
  handle: "String",
  name: "String",
  sourceSortBucket: "Int",
  sortName: "String",
};

const facetSourceCandidateWhere = generateWhereInputType(
  facetSourceCandidateRelayQuery,
  "FacetSourceCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetSourceCandidateFieldTypes,
    excludeFields: ["storeId", "locale"],
  },
);

const facetSourceCandidateOrderBy = generateOrderByInputType(
  facetSourceCandidateRelayQuery,
  "FacetSourceCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetSourceCandidateFieldTypes,
    excludeFields: ["storeId", "locale"],
  },
);

const facetValueCandidateFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  facetType: "String",
  sourceHandle: "String",
  handle: "String",
  label: "String",
};

const facetValueCandidateWhere = generateWhereInputType(
  facetTagValueCandidateRelayQuery,
  "FacetValueCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetValueCandidateFieldTypes,
    excludeFields: ["storeId", "locale", "facetType", "sourceHandle"],
  },
);

const facetValueCandidateOrderBy = generateOrderByInputType(
  facetTagValueCandidateRelayQuery,
  "FacetValueCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetValueCandidateFieldTypes,
    excludeFields: ["storeId", "locale", "facetType", "sourceHandle"],
  },
);

const content = `# Auto-generated GraphQL filter types for Catalog service.
# Do not edit manually. Run: yarn generate:filters

# ---- Product ----

${productWhere}

${productOrderBy}

# ---- Vendor ----

${vendorWhere}

${vendorOrderBy}

# ---- ProductOptionCategory ----

${optionCategoryWhere}

${optionCategoryOrderBy}

# ---- Category ----

${categoryWhere}

${categoryOrderBy}

# ---- Tag ----

${tagWhere}

${tagOrderBy}

# ---- Warehouse ----

${warehouseWhere}

${warehouseOrderBy}

${warehouseConnectionInput}

# ---- WarehouseStock ----

${warehouseStockWhere}

${warehouseStockOrderBy}

${warehouseStockConnectionInput}

# ---- Variant ----

${variantWhere}

${variantOrderBy}

# ---- FacetSourceCandidate ----

${facetSourceCandidateWhere}

${facetSourceCandidateOrderBy}

# ---- FacetValueCandidate ----

${facetValueCandidateWhere}

${facetValueCandidateOrderBy}
`;

writeFileSync("src/api/graphql-admin/schema/__generated__/filters.graphql", content);
console.log("✅ Generated filters.graphql");
