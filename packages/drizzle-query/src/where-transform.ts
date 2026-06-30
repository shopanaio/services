import { isFilterObject, type OperatorKey } from "./operators.js";
import type { FieldsDef, LocalLeafPaths, NestedWhereInput } from "./types.js";

export type WhereFieldOperator = OperatorKey | "shorthand";

export type WhereFieldMapperContext = {
  path: string;
  field: string;
  operator: WhereFieldOperator;
};

export type WhereFieldMapper = (
  value: unknown,
  context: WhereFieldMapperContext
) => unknown;

export type WhereFieldMapperConfig = {
  map: WhereFieldMapper;
  operators?: readonly WhereFieldOperator[];
};

export type WhereFieldMappers<Fields extends FieldsDef> = Partial<
  Record<LocalLeafPaths<Fields>, WhereFieldMapper | WhereFieldMapperConfig>
>;

/** @internal */
export type WhereFieldMapperScope = {
  mappers: Record<string, WhereFieldMapper | WhereFieldMapperConfig>;
  relations: Record<string, () => WhereFieldMapperScope>;
};

const DEFAULT_MAPPED_OPERATORS = new Set<WhereFieldOperator>([
  "shorthand",
  "_eq",
  "_neq",
  "_gt",
  "_gte",
  "_lt",
  "_lte",
  "_in",
  "_notIn",
  "_between",
]);

const ARRAY_OPERATORS = new Set<WhereFieldOperator>([
  "_in",
  "_notIn",
  "_between",
]);

export function transformWhereInput<Fields extends FieldsDef>(
  where: NestedWhereInput<Fields> | null | undefined,
  scope: WhereFieldMapperScope
): NestedWhereInput<Fields> | null | undefined {
  return transformWhereNode(where, scope) as
    | NestedWhereInput<Fields>
    | null
    | undefined;
}

function transformWhereNode(
  node: unknown,
  scope: WhereFieldMapperScope,
  pathPrefix = ""
): unknown {
  if (!isPlainRecord(node)) {
    return node;
  }

  let changed = false;
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === "_and" || key === "_or") {
      const mappedList = Array.isArray(value)
        ? mapArrayWithStructuralSharing(value, (item) =>
            transformWhereNode(item, scope, pathPrefix)
          )
        : value;
      changed ||= mappedList !== value;
      next[key] = mappedList;
      continue;
    }

    if (key === "_not") {
      const mapped = transformWhereNode(value, scope, pathPrefix);
      changed ||= mapped !== value;
      next[key] = mapped;
      continue;
    }

    if (key.startsWith("_")) {
      next[key] = value;
      continue;
    }

    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    const childScope = scope.relations[key]?.();

    if (childScope && isNestedWhereObject(value)) {
      const mapped = transformWhereNode(value, childScope, path);
      changed ||= mapped !== value;
      next[key] = mapped;
      continue;
    }

    const mapped = transformFieldFilter(scope.mappers[key], path, key, value);
    changed ||= mapped !== value;
    next[key] = mapped;
  }

  return changed ? next : node;
}

function transformFieldFilter(
  mapperOrConfig: WhereFieldMapper | WhereFieldMapperConfig | undefined,
  path: string,
  field: string,
  value: unknown
): unknown {
  if (!mapperOrConfig || value === null || value === undefined) {
    return value;
  }

  const mapper = getMapper(mapperOrConfig);
  const configuredOperators = getConfiguredOperators(mapperOrConfig);

  if (isFilterObject(value)) {
    let changed = false;
    const next: Record<string, unknown> = {};

    for (const [operator, operatorValue] of Object.entries(value)) {
      const mapped = transformOperatorValue(
        mapper,
        configuredOperators,
        path,
        field,
        operator,
        operatorValue
      );
      changed ||= mapped !== operatorValue;
      next[operator] = mapped;
    }

    return changed ? next : value;
  }

  if (
    isPlainRecord(value) ||
    !shouldMapOperator(configuredOperators, "shorthand", value)
  ) {
    return value;
  }

  return mapper(value, { path, field, operator: "shorthand" });
}

function transformOperatorValue(
  mapper: WhereFieldMapper,
  configuredOperators: ReadonlySet<WhereFieldOperator> | undefined,
  path: string,
  field: string,
  operator: string,
  value: unknown
): unknown {
  if (!isWhereFieldOperator(operator)) {
    return value;
  }

  if (!shouldMapOperator(configuredOperators, operator, value)) {
    return value;
  }

  if (ARRAY_OPERATORS.has(operator)) {
    if (!Array.isArray(value)) {
      return value;
    }

    return mapArrayWithStructuralSharing(value, (item) =>
      mapper(item, { path, field, operator })
    );
  }

  return mapper(value, { path, field, operator });
}

function shouldMapOperator(
  configuredOperators: ReadonlySet<WhereFieldOperator> | undefined,
  operator: WhereFieldOperator,
  value: unknown
): boolean {
  if (configuredOperators) {
    return configuredOperators.has(operator);
  }

  return (
    DEFAULT_MAPPED_OPERATORS.has(operator) &&
    value !== null &&
    value !== undefined
  );
}

function getMapper(
  mapperOrConfig: WhereFieldMapper | WhereFieldMapperConfig
): WhereFieldMapper {
  return typeof mapperOrConfig === "function"
    ? mapperOrConfig
    : mapperOrConfig.map;
}

function getConfiguredOperators(
  mapperOrConfig: WhereFieldMapper | WhereFieldMapperConfig
): ReadonlySet<WhereFieldOperator> | undefined {
  if (typeof mapperOrConfig === "function" || !mapperOrConfig.operators) {
    return undefined;
  }
  return new Set(mapperOrConfig.operators);
}

function isWhereFieldOperator(operator: string): operator is WhereFieldOperator {
  return operator === "shorthand" || operator.startsWith("_");
}

function mapArrayWithStructuralSharing(
  values: readonly unknown[],
  map: (value: unknown) => unknown
): unknown[] {
  let changed = false;
  const next = values.map((value) => {
    const mapped = map(value);
    changed ||= mapped !== value;
    return mapped;
  });

  return changed ? next : (values as unknown[]);
}

function isNestedWhereObject(value: unknown): value is Record<string, unknown> {
  return isPlainRecord(value) && !isFilterObject(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
