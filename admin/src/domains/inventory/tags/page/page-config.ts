import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import { FilterOperator } from "@/layouts/filters";
import type { IFilterValue } from "@/layouts/filters/core/types";
import type {
  ApiDateTimeFilter,
  ApiIntFilter,
  ApiStringFilter,
  ApiTagOrderByInput,
  ApiTagWhereInput,
} from "@/graphql/types";
import { TagOrderField } from "@/graphql/types";
import type { TagsQueryVariables } from "../graphql/operation-types";

type TagsWhereInput = ApiTagWhereInput;
type TagsOrderField = TagOrderField;

export const tagSortFieldMapping: SortFieldMapping<TagsOrderField> = {
  title: TagOrderField.Name,
  name: TagOrderField.Name,
  handle: TagOrderField.Handle,
  productsCount: TagOrderField.ProductsCount,
  createdAt: TagOrderField.CreatedAt,
};

export const buildTagSearchCondition = (
  search: string,
): Partial<ApiTagWhereInput> => ({
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
  if (filter.operator !== FilterOperator.Between) {
    return null;
  }

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

function createStringFilterTransformer(
  fieldName: "name" | "handle",
): FilterTransformer<ApiTagWhereInput> {
  return (filter, gqlOperator) => {
    const condition = buildStringFilter(filter, gqlOperator);
    return condition ? { [fieldName]: condition } : null;
  };
}

function createIntFilterTransformer(
  fieldName: "productsCount",
): FilterTransformer<ApiTagWhereInput> {
  return (filter, gqlOperator) => {
    const condition = buildIntFilter(filter, gqlOperator);
    return condition ? { [fieldName]: condition } : null;
  };
}

function createDateTimeFilterTransformer(
  fieldName: "createdAt",
): FilterTransformer<ApiTagWhereInput> {
  return (filter) => {
    const condition = buildDateTimeFilter(filter);
    return condition ? { [fieldName]: condition } : null;
  };
}

export const tagFilterTransformers: Record<
  string,
  FilterTransformer<ApiTagWhereInput>
> = {
  name: createStringFilterTransformer("name"),
  handle: createStringFilterTransformer("handle"),
  productsCount: createIntFilterTransformer("productsCount"),
  createdAt: createDateTimeFilterTransformer("createdAt"),
};

export function buildTagsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<TagsWhereInput, TagsOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TagsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiTagOrderByInput[] | null,
  };
}

export function toTagsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TagsQueryVariables {
  return buildTagsQueryVariables({
    ...pageConfig,
    where: pageConfig.where as ApiTagWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<TagOrderField>[]
      | undefined,
  });
}

export type {
  TagsOrderField,
  TagsWhereInput,
};
