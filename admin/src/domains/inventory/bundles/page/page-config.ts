import type {
  FilterTransformer,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import type {
  ApiBundleOrderByInput,
  ApiBundleWhereInput,
} from "@/graphql/types";
import { BundleOrderField } from "@/graphql/types";
import {
  buildProductLikeQueryVariables,
  buildProductLikeSearchCondition,
  createProductLikeFilterTransformers,
  createProductLikeSortFieldMapping,
  toProductLikeQueryVariables,
} from "@/domains/inventory/products/list-page";
import type { BundlesQueryVariables } from "../graphql";

export const bundleSortFieldMapping: SortFieldMapping<BundleOrderField> = {
  ...createProductLikeSortFieldMapping<BundleOrderField>({
    Name: BundleOrderField.Name,
    MinPriceMinor: BundleOrderField.MinPriceMinor,
    MaxPriceMinor: BundleOrderField.MaxPriceMinor,
    PrimaryCategoryName: BundleOrderField.PrimaryCategoryName,
    BrandName: BundleOrderField.BrandName,
  }),
  type: BundleOrderField.BundleType,
};

export const buildBundleSearchCondition =
  buildProductLikeSearchCondition<ApiBundleWhereInput>;

export const bundleFilterTransformers: Record<
  string,
  FilterTransformer<ApiBundleWhereInput>
> = {
  ...createProductLikeFilterTransformers<ApiBundleWhereInput>(),
};

export function buildBundlesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiBundleWhereInput, BundleOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): BundlesQueryVariables {
  return buildProductLikeQueryVariables<
    BundlesQueryVariables,
    ApiBundleWhereInput,
    BundleOrderField,
    ApiBundleOrderByInput
  >(pageConfig);
}

export function toBundlesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): BundlesQueryVariables {
  return toProductLikeQueryVariables<
    BundlesQueryVariables,
    ApiBundleWhereInput,
    BundleOrderField,
    ApiBundleOrderByInput
  >(pageConfig);
}
