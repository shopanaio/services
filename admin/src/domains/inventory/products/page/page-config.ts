import type {
  FilterTransformer,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import type {
  ApiProductOrderByInput,
  ApiProductWhereInput,
} from "@/graphql/types";
import { ProductOrderField } from "@/graphql/types";
import {
  buildProductLikeQueryVariables,
  buildProductLikeSearchCondition,
  createProductLikeFilterTransformers,
  createProductLikeSortFieldMapping,
  toProductLikeQueryVariables,
} from "../list-page";
import type { ProductsQueryVariables } from "../graphql/operation-types";

export const productSortFieldMapping: SortFieldMapping<ProductOrderField> =
  createProductLikeSortFieldMapping<ProductOrderField>({
    Name: ProductOrderField.Name,
    MinPriceMinor: ProductOrderField.MinPriceMinor,
    MaxPriceMinor: ProductOrderField.MaxPriceMinor,
    PrimaryCategoryName: ProductOrderField.PrimaryCategoryName,
    BrandName: ProductOrderField.BrandName,
  });

export const buildProductSearchCondition =
  buildProductLikeSearchCondition<ApiProductWhereInput>;

export const productFilterTransformers: Record<
  string,
  FilterTransformer<ApiProductWhereInput>
> = createProductLikeFilterTransformers<ApiProductWhereInput>();

export function buildProductsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiProductWhereInput, ProductOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ProductsQueryVariables {
  return buildProductLikeQueryVariables<
    ProductsQueryVariables,
    ApiProductWhereInput,
    ProductOrderField,
    ApiProductOrderByInput
  >(pageConfig);
}

export function toProductsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ProductsQueryVariables {
  return toProductLikeQueryVariables<
    ProductsQueryVariables,
    ApiProductWhereInput,
    ProductOrderField,
    ApiProductOrderByInput
  >(pageConfig);
}
