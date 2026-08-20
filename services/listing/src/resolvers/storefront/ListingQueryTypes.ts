import type {
  CategoryProductsArgs,
  ListingFilterInput,
  ListingSort,
  QueryProductsArgs,
  QuerySearchProductsArgs,
} from "./generated/types.js";

export type ListingEntryPoint = "products" | "search" | "category" | "collection";

export interface ProductConnectionInput {
  entryPoint: ListingEntryPoint;
  categoryId?: string;
  collectionId?: string;
  collectionListingRevision?: number;
  collectionRulesHash?: string;
  collectionMembershipBitmap?: string;
  collectionProductBitmap?: string;
  collectionVariantBitmap?: string;
  collectionType?: "manual" | "rule";
  collectionDefaultSort?: ListingSort;
  query?: string | null;
  first?: number | null;
  after?: string | null;
  filters?: ListingFilterInput[] | null;
  sort?: ListingSort | null;
}

export function globalProductsInput(
  args: QueryProductsArgs
): ProductConnectionInput {
  return {
    entryPoint: "products",
    first: args.first,
    after: args.after,
    filters: args.filters,
    sort: args.sort,
  };
}

export function searchProductsInput(
  args: QuerySearchProductsArgs
): ProductConnectionInput {
  return {
    entryPoint: "search",
    query: args.query,
    first: args.first,
    after: args.after,
    filters: args.filters,
    sort: args.sort,
  };
}

export function categoryProductsInput(
  categoryId: string,
  args: CategoryProductsArgs
): ProductConnectionInput {
  return {
    entryPoint: "category",
    categoryId,
    query: args.query,
    first: args.first,
    after: args.after,
    filters: args.filters,
    sort: args.sort,
  };
}

export interface ProductReference {
  __typename: "Product";
  id: string;
}
