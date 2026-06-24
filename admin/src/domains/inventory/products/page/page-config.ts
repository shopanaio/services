import {
  createMinorUnitPriceTransformer,
  createRelationInTransformer,
} from "@/hooks";
import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import type {
  ApiProductOrderByInput,
  ApiProductWhereInput,
} from "@/graphql/types";
import { ProductOrderField } from "@/graphql/types";
import type { ProductsQueryVariables } from "../graphql/operation-types";

export const productSortFieldMapping: SortFieldMapping<ProductOrderField> = {
  title: ProductOrderField.Name,
  minPriceMinor: ProductOrderField.MinPriceMinor,
  maxPriceMinor: ProductOrderField.MaxPriceMinor,
  primaryCategoryName: ProductOrderField.PrimaryCategoryName,
  brand: ProductOrderField.BrandName,
};

export const buildProductSearchCondition = (
  search: string,
): Partial<ApiProductWhereInput> => ({
  name: { _containsi: search },
});

export const productFilterTransformers: Record<
  string,
  FilterTransformer<ApiProductWhereInput>
> = {
  primaryCategoryId:
    createRelationInTransformer<ApiProductWhereInput>("primaryCategoryId"),
  minPriceMinor:
    createMinorUnitPriceTransformer<ApiProductWhereInput>("minPriceMinor"),
  maxPriceMinor:
    createMinorUnitPriceTransformer<ApiProductWhereInput>("maxPriceMinor"),
  vendorId: createRelationInTransformer<ApiProductWhereInput>("vendorId"),
};

export function buildProductsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiProductWhereInput, ProductOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ProductsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiProductOrderByInput[] | null,
  };
}

export function toProductsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): ProductsQueryVariables {
  return buildProductsQueryVariables({
    ...pageConfig,
    where: pageConfig.where as ApiProductWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<ProductOrderField>[]
      | undefined,
  });
}
