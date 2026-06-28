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

type ProductLikeCommonOrderField =
  | "Name"
  | "MinPriceMinor"
  | "MaxPriceMinor"
  | "PrimaryCategoryName"
  | "BrandName";

export type ProductLikeOrderFieldEnum = {
  Name: string;
} & Partial<Record<Exclude<ProductLikeCommonOrderField, "Name">, string>>;

export function createProductLikeSortFieldMapping<TOrderField extends string>(
  fields: ProductLikeOrderFieldEnum,
): SortFieldMapping<TOrderField> {
  const mapping: Record<string, string> = {
    title: fields.Name,
  };

  if (fields.MinPriceMinor) mapping.minPriceMinor = fields.MinPriceMinor;
  if (fields.MaxPriceMinor) mapping.maxPriceMinor = fields.MaxPriceMinor;
  if (fields.PrimaryCategoryName) {
    mapping.primaryCategoryName = fields.PrimaryCategoryName;
  }
  if (fields.BrandName) mapping.brand = fields.BrandName;

  return mapping as SortFieldMapping<TOrderField>;
}

export function buildProductLikeSearchCondition<TWhereInput extends object>(
  search: string,
): Partial<TWhereInput> {
  return { name: { _containsi: search } } as unknown as Partial<TWhereInput>;
}

export function createProductLikeFilterTransformers<
  TWhereInput extends object,
>(): Record<string, FilterTransformer<TWhereInput>> {
  return {
    primaryCategoryId:
      createRelationInTransformer<TWhereInput>("primaryCategoryId"),
    minPriceMinor:
      createMinorUnitPriceTransformer<TWhereInput>("minPriceMinor"),
    maxPriceMinor:
      createMinorUnitPriceTransformer<TWhereInput>("maxPriceMinor"),
    vendorId: createRelationInTransformer<TWhereInput>("vendorId"),
  };
}

export function buildProductLikeQueryVariables<
  TVariables,
  TWhereInput extends object,
  TOrderField extends string,
  TOrderByInput,
>(
  pageConfig: Pick<
    UsePageConfigReturn<TWhereInput, TOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as TOrderByInput[] | null,
  } as TVariables;
}

export function toProductLikeQueryVariables<
  TVariables,
  TWhereInput extends object,
  TOrderField extends string,
  TOrderByInput,
>(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TVariables {
  return buildProductLikeQueryVariables<
    TVariables,
    TWhereInput,
    TOrderField,
    TOrderByInput
  >({
    ...pageConfig,
    where: pageConfig.where as TWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<TOrderField>[]
      | undefined,
  });
}
