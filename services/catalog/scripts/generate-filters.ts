import { writeFileSync } from "fs";
import {
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { categoryRelayQuery } from "../src/repositories/category/CategoryRepository.js";
import {
  bundleRelayQuery,
  listingRelayQuery,
  productRelayQuery,
} from "../src/repositories/product/ProductRepository.js";
import { tagRelayQuery } from "../src/repositories/tag/TagRepository.js";
import { vendorRelayQuery } from "../src/repositories/vendor/VendorRepository.js";
import { variantRelayQuery } from "../src/repositories/variant/VariantRepository.js";
import { warehouseRelayQuery } from "../src/repositories/warehouse/WarehouseRepository.js";
import { stockRelayQuery } from "../src/repositories/stock/StockRepository.js";
import {
  facetSourceCandidateRelayQuery,
  facetValueCandidateFilterRelayQuery,
} from "../src/repositories/facet/FacetRepository.js";

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

const listingListFieldTypes: Record<string, GraphQLFieldType> = {
  ...productListFieldTypes,
  kind: "String",
};

const listingWhere = generateWhereInputType(listingRelayQuery, "Listing", {
  includeDescriptions: true,
  fieldTypes: listingListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const listingOrderBy = generateOrderByInputType(listingRelayQuery, "Listing", {
  includeDescriptions: true,
  fieldTypes: listingListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const productWhere = generateWhereInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  fieldTypes: productListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision", "kind"],
});

const productOrderBy = generateOrderByInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  fieldTypes: productListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision", "kind"],
});

const bundleListFieldTypes: Record<string, GraphQLFieldType> = {
  ...productListFieldTypes,
  bundleType: "String",
};

const bundleWhere = generateWhereInputType(bundleRelayQuery, "Bundle", {
  includeDescriptions: true,
  fieldTypes: bundleListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision", "kind"],
});

const bundleOrderBy = generateOrderByInputType(bundleRelayQuery, "Bundle", {
  includeDescriptions: true,
  fieldTypes: bundleListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision", "kind"],
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

const warehouseWhere = generateWhereInputType(warehouseRelayQuery, "Warehouse", {
  includeDescriptions: true,
  excludeFields: ["projectId"],
});

const warehouseOrderBy = generateOrderByInputType(warehouseRelayQuery, "Warehouse", {
  includeDescriptions: true,
  excludeFields: ["projectId"],
});

const warehouseConnectionInput = generateConnectionInputType("Warehouse");

const warehouseStockWhere = generateWhereInputType(
  stockRelayQuery,
  "WarehouseStock",
  {
    includeDescriptions: true,
    excludeFields: ["projectId", "reservedQty", "unavailableQty"],
  }
);

const warehouseStockOrderBy = generateOrderByInputType(
  stockRelayQuery,
  "WarehouseStock",
  {
    includeDescriptions: true,
    excludeFields: ["projectId", "reservedQty", "unavailableQty"],
  }
);

const warehouseStockConnectionInput =
  generateConnectionInputType("WarehouseStock");

const variantWhere = generateWhereInputType(variantRelayQuery, "Variant", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "sku", "kind"],
});

const variantOrderBy = generateOrderByInputType(variantRelayQuery, "Variant", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "sku", "kind"],
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
    excludeFields: ["projectId", "locale"],
  }
);

const facetSourceCandidateOrderBy = generateOrderByInputType(
  facetSourceCandidateRelayQuery,
  "FacetSourceCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetSourceCandidateFieldTypes,
    excludeFields: ["projectId", "locale"],
  }
);

const facetValueCandidateFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  facetType: "String",
  sourceHandle: "String",
  handle: "String",
  label: "String",
};

const facetValueCandidateWhere = generateWhereInputType(
  facetValueCandidateFilterRelayQuery,
  "FacetValueCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetValueCandidateFieldTypes,
    excludeFields: ["projectId", "locale", "facetType", "sourceHandle"],
  }
);

const facetValueCandidateOrderBy = generateOrderByInputType(
  facetValueCandidateFilterRelayQuery,
  "FacetValueCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetValueCandidateFieldTypes,
    excludeFields: ["projectId", "locale", "facetType", "sourceHandle"],
  }
);

const content = `# Auto-generated GraphQL filter types for Catalog service.
# Do not edit manually. Run: yarn generate:filters

# ---- Listing ----

${listingWhere}

${listingOrderBy}

# ---- Product ----

${productWhere}

${productOrderBy}

# ---- Bundle ----

${bundleWhere}

${bundleOrderBy}

# ---- Vendor ----

${vendorWhere}

${vendorOrderBy}

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
