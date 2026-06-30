import { FilterOperator } from "../core/types";
import type { IFilterValue } from "../core/types";

type GraphqlStringOperator = "_eq" | "_neq" | "_contains" | "_containsi";
type GraphqlIntOperator = "_eq" | "_gt" | "_gte" | "_lt" | "_lte";

type GraphqlStringFilter = Partial<Record<GraphqlStringOperator, string>>;
type GraphqlIntFilter = Partial<Record<GraphqlIntOperator, number>>;
type GraphqlDateTimeFilter = Partial<Record<"_gte" | "_lte", string>>;

export type GraphqlFilterTransformer<TWhereInput extends object> = (
  filter: IFilterValue,
  gqlOperator: string,
) => Partial<TWhereInput> | null | undefined;

const stringOperators = new Set<string>([
  "_eq",
  "_neq",
  "_contains",
  "_containsi",
]);

const intOperators = new Set<string>(["_eq", "_gt", "_gte", "_lt", "_lte"]);

function isEmptyGraphqlFilterValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEmptyGraphqlFilterValue);
  }

  return value === null || value === undefined || value === "";
}

function getFirstGraphqlFilterValue(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.find((item) => !isEmptyGraphqlFilterValue(item));
}

function toDateTimeInput(value: unknown): string | null {
  if (isEmptyGraphqlFilterValue(value)) {
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

function buildGraphqlStringFilter(
  filter: IFilterValue,
  gqlOperator: string,
): GraphqlStringFilter | null {
  if (!stringOperators.has(gqlOperator)) {
    return null;
  }

  const value = getFirstGraphqlFilterValue(filter.value);

  if (isEmptyGraphqlFilterValue(value)) {
    return null;
  }

  return { [gqlOperator]: String(value) } as GraphqlStringFilter;
}

function buildGraphqlIntFilter(
  filter: IFilterValue,
  gqlOperator: string,
): GraphqlIntFilter | null {
  if (!intOperators.has(gqlOperator)) {
    return null;
  }

  const value = getFirstGraphqlFilterValue(filter.value);

  if (isEmptyGraphqlFilterValue(value)) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return { [gqlOperator]: numberValue } as GraphqlIntFilter;
}

function buildGraphqlDateTimeRangeFilter(
  filter: IFilterValue,
): GraphqlDateTimeFilter | null {
  if (filter.operator !== FilterOperator.Between) {
    return null;
  }

  const values = Array.isArray(filter.value) ? filter.value : [];
  const [startValue, endValue] = values;
  const start = toDateTimeInput(startValue);
  const end = toDateTimeInput(endValue);
  const condition: GraphqlDateTimeFilter = {};

  if (start) {
    condition._gte = start;
  }

  if (end) {
    condition._lte = end;
  }

  return Object.keys(condition).length > 0 ? condition : null;
}

export function createGraphqlStringFilterTransformer<
  TWhereInput extends object,
>(fieldName: string): GraphqlFilterTransformer<TWhereInput> {
  return (filter, gqlOperator) => {
    const condition = buildGraphqlStringFilter(filter, gqlOperator);
    return condition ? ({ [fieldName]: condition } as Partial<TWhereInput>) : null;
  };
}

export function createGraphqlIntFilterTransformer<TWhereInput extends object>(
  fieldName: string,
): GraphqlFilterTransformer<TWhereInput> {
  return (filter, gqlOperator) => {
    const condition = buildGraphqlIntFilter(filter, gqlOperator);
    return condition ? ({ [fieldName]: condition } as Partial<TWhereInput>) : null;
  };
}

export function createGraphqlDateTimeRangeFilterTransformer<
  TWhereInput extends object,
>(fieldName: string): GraphqlFilterTransformer<TWhereInput> {
  return (filter) => {
    const condition = buildGraphqlDateTimeRangeFilter(filter);
    return condition ? ({ [fieldName]: condition } as Partial<TWhereInput>) : null;
  };
}
