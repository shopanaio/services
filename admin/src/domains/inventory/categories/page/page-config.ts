import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import { FilterOperator } from "@/layouts/filters";
import type { IFilterValue } from "@/layouts/filters/core/types";
import type {
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
  ApiDateTimeFilter,
  ApiIntFilter,
  ApiStringFilter,
} from "@/graphql/types";
import { CategoryOrderField } from "@/graphql/types";
import type { CategoriesQueryVariables } from "../graphql";

export const categorySortFieldMapping: SortFieldMapping<CategoryOrderField> = {
  title: CategoryOrderField.Name,
  name: CategoryOrderField.Name,
  handle: CategoryOrderField.Handle,
  depth: CategoryOrderField.Depth,
  productsCount: CategoryOrderField.ProductsCount,
  createdAt: CategoryOrderField.CreatedAt,
  updatedAt: CategoryOrderField.UpdatedAt,
  publishedAt: CategoryOrderField.PublishedAt,
};

export const buildCategorySearchCondition = (
  search: string,
): Partial<ApiCategoryWhereInput> => ({
  _or: [
    { name: { _containsi: search } },
    { handle: { _containsi: search } },
  ],
});

function isEmptyFilterValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEmptyFilterValue);
  }

  return value === null || value === undefined || value === "";
}

function getFirstFilterValue(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.find((item) => !isEmptyFilterValue(item));
}

function toDateTimeInput(value: unknown): string | null {
  if (isEmptyFilterValue(value)) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object" && value !== null) {
    const maybeDate = value as { toISOString?: () => string };

    if (typeof maybeDate.toISOString === "function") {
      return maybeDate.toISOString();
    }
  }

  return null;
}

function buildStringFilter(
  filter: IFilterValue,
  gqlOperator: string,
): ApiStringFilter | null {
  const value = getFirstFilterValue(filter.value);

  if (isEmptyFilterValue(value)) {
    return null;
  }

  if (
    gqlOperator !== "_eq" &&
    gqlOperator !== "_neq" &&
    gqlOperator !== "_contains" &&
    gqlOperator !== "_containsi"
  ) {
    return null;
  }

  return { [gqlOperator]: String(value) } as ApiStringFilter;
}

function buildIntFilter(
  filter: IFilterValue,
  gqlOperator: string,
): ApiIntFilter | null {
  const value = getFirstFilterValue(filter.value);

  if (isEmptyFilterValue(value)) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (
    gqlOperator !== "_eq" &&
    gqlOperator !== "_gt" &&
    gqlOperator !== "_gte" &&
    gqlOperator !== "_lt" &&
    gqlOperator !== "_lte"
  ) {
    return null;
  }

  return { [gqlOperator]: numberValue } as ApiIntFilter;
}

function buildDateTimeFilter(filter: IFilterValue): ApiDateTimeFilter | null {
  if (filter.operator === FilterOperator.Between) {
    const values = Array.isArray(filter.value) ? filter.value : [];
    const [startValue, endValue] = values;
    const start = toDateTimeInput(startValue);
    const end = toDateTimeInput(endValue);
    const condition: ApiDateTimeFilter = {};

    if (start) {
      condition._gte = start;
    }

    if (end) {
      condition._lte = end;
    }

    return Object.keys(condition).length > 0 ? condition : null;
  }

  return null;
}

function createStringFilterTransformer(
  fieldName: "name" | "handle",
): FilterTransformer<ApiCategoryWhereInput> {
  return (filter, gqlOperator) => {
    const condition = buildStringFilter(filter, gqlOperator);
    return condition ? { [fieldName]: condition } : null;
  };
}

function createIntFilterTransformer(
  fieldName: "depth" | "productsCount",
): FilterTransformer<ApiCategoryWhereInput> {
  return (filter, gqlOperator) => {
    const condition = buildIntFilter(filter, gqlOperator);
    return condition ? { [fieldName]: condition } : null;
  };
}

function createDateTimeFilterTransformer(
  fieldName: "publishedAt" | "createdAt" | "updatedAt",
): FilterTransformer<ApiCategoryWhereInput> {
  return (filter) => {
    const condition = buildDateTimeFilter(filter);
    return condition ? { [fieldName]: condition } : null;
  };
}

export const categoryFilterTransformers: Record<
  string,
  FilterTransformer<ApiCategoryWhereInput>
> = {
  name: createStringFilterTransformer("name"),
  handle: createStringFilterTransformer("handle"),
  depth: createIntFilterTransformer("depth"),
  productsCount: createIntFilterTransformer("productsCount"),
  publishedAt: createDateTimeFilterTransformer("publishedAt"),
  createdAt: createDateTimeFilterTransformer("createdAt"),
  updatedAt: createDateTimeFilterTransformer("updatedAt"),
};

export function buildCategoriesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiCategoryWhereInput, CategoryOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): CategoriesQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiCategoryOrderByInput[] | null,
  };
}

export function toCategoriesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): CategoriesQueryVariables {
  return buildCategoriesQueryVariables({
    ...pageConfig,
    where: pageConfig.where as ApiCategoryWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<CategoryOrderField>[]
      | undefined,
  });
}
