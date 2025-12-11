/**
 * Type inference utilities for extracting types from query builders.
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses).maxLimit(100);
 *
 * // Extract types from query
 * type WarehouseWhere = InferWhere<typeof warehouseQuery>;
 * type WarehouseOrder = InferOrder<typeof warehouseQuery>;
 * type WarehouseSelect = InferSelect<typeof warehouseQuery>;
 * type WarehouseResult = InferResult<typeof warehouseQuery>;
 *
 * // Use in function signatures
 * function getWarehouses(where: WarehouseWhere, order: WarehouseOrder[]) { ... }
 * ```
 */

import type { Table } from "drizzle-orm";
import type { FluentQueryBuilder } from "./builder/fluent-query-builder.js";
import type {
  RelayQueryBuilder,
  CursorQueryBuilder,
  RelayQueryInput,
  CursorQueryInput,
} from "./builder/pagination-query-builder.js";
import type { FluentFieldsDef, ToFieldsDef, ExecuteOptions } from "./builder/fluent-types.js";
import type { NestedWhereInput, NestedPaths, OrderByItem, FieldsDef } from "./types.js";

// =============================================================================
// FluentQueryBuilder type inference
// =============================================================================

/**
 * Extract the FieldsDef from a FluentQueryBuilder
 */
export type InferFields<Q> = Q extends FluentQueryBuilder<
  infer _T,
  infer Fields,
  infer _InferredFields,
  infer _Types
>
  ? ToFieldsDef<Fields>
  : Q extends RelayQueryBuilder<infer _T, infer Fields, infer _InferredFields, infer _Types>
    ? ToFieldsDef<Fields>
    : Q extends CursorQueryBuilder<infer _T, infer Fields, infer _InferredFields, infer _Types>
      ? ToFieldsDef<Fields>
      : never;

/**
 * Extract the Where input type from a query builder
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 * type WarehouseWhere = InferWhere<typeof warehouseQuery>;
 * // { id?: FilterValue; name?: FilterValue; ... }
 * ```
 */
export type InferWhere<Q> = Q extends FluentQueryBuilder<
  infer _T,
  infer _Fields,
  infer InferredFields,
  infer _Types
>
  ? NestedWhereInput<InferredFields>
  : Q extends RelayQueryBuilder<infer _T, infer _Fields, infer InferredFields, infer _Types>
    ? NestedWhereInput<InferredFields>
    : Q extends CursorQueryBuilder<infer _T, infer _Fields, infer InferredFields, infer _Types>
      ? NestedWhereInput<InferredFields>
      : never;

/**
 * Extract all valid Order fields from a query builder (union of strings)
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 * type WarehouseOrderField = InferOrderPath<typeof warehouseQuery>;
 * // "id" | "name" | "createdAt" | ...
 * ```
 */
export type InferOrderPath<Q> = Q extends FluentQueryBuilder<
  infer _T,
  infer _Fields,
  infer InferredFields,
  infer _Types
>
  ? NestedPaths<InferredFields>
  : Q extends RelayQueryBuilder<infer _T, infer _Fields, infer InferredFields, infer _Types>
    ? NestedPaths<InferredFields>
    : Q extends CursorQueryBuilder<infer _T, infer _Fields, infer InferredFields, infer _Types>
      ? NestedPaths<InferredFields>
      : never;

/**
 * Extract the Order input type (array of OrderByItem) from a query builder
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 * type WarehouseOrder = InferOrder<typeof warehouseQuery>;
 * // OrderByItem<"id" | "name" | ...>[]
 * ```
 */
export type InferOrder<Q> = OrderByItem<InferOrderPath<Q>>[];

/**
 * Extract all valid Select paths from a query builder (union of strings)
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 * type WarehouseSelectPath = InferSelectPath<typeof warehouseQuery>;
 * // "id" | "name" | "code" | ...
 * ```
 */
export type InferSelectPath<Q> = Q extends FluentQueryBuilder<
  infer _T,
  infer _Fields,
  infer InferredFields,
  infer _Types
>
  ? NestedPaths<InferredFields>
  : Q extends RelayQueryBuilder<infer _T, infer _Fields, infer InferredFields, infer _Types>
    ? NestedPaths<InferredFields>
    : Q extends CursorQueryBuilder<infer _T, infer _Fields, infer InferredFields, infer _Types>
      ? NestedPaths<InferredFields>
      : never;

/**
 * Extract the Select input type (array of select paths) from a query builder
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 * type WarehouseSelect = InferSelect<typeof warehouseQuery>;
 * // ("id" | "name" | "code" | ...)[]
 * ```
 */
export type InferSelect<Q> = InferSelectPath<Q>[];

/**
 * Extract the result type from a query builder
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 * type Warehouse = InferResult<typeof warehouseQuery>;
 * // { id: string; name: string; code: string; ... }
 * ```
 */
export type InferResult<Q> = Q extends FluentQueryBuilder<
  infer _T,
  infer _Fields,
  infer _InferredFields,
  infer Types
>
  ? Types
  : Q extends RelayQueryBuilder<infer _T, infer _Fields, infer _InferredFields, infer Types>
    ? Types
    : Q extends CursorQueryBuilder<infer _T, infer _Fields, infer _InferredFields, infer Types>
      ? Types
      : never;

/**
 * Extract the full execute options type from a FluentQueryBuilder
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 * type WarehouseQueryOptions = InferExecuteOptions<typeof warehouseQuery>;
 * // { where?: ...; order?: ...; select?: ...; limit?: number; offset?: number }
 * ```
 */
export type InferExecuteOptions<Q> = Q extends FluentQueryBuilder<
  infer _T,
  infer _Fields,
  infer InferredFields,
  infer _Types
>
  ? ExecuteOptions<InferredFields>
  : never;

/**
 * Extract the RelayQueryInput type from a RelayQueryBuilder
 *
 * @example
 * ```ts
 * const warehouseRelay = createRelayQuery(warehouseQuery);
 * type WarehouseRelayInput = InferRelayInput<typeof warehouseRelay>;
 * // { first?: number; after?: string; last?: number; before?: string; where?: ...; order?: ... }
 * ```
 */
export type InferRelayInput<Q> = Q extends RelayQueryBuilder<
  infer _T,
  infer _Fields,
  infer InferredFields,
  infer _Types
>
  ? RelayQueryInput<InferredFields>
  : never;

/**
 * Extract the CursorQueryInput type from a CursorQueryBuilder
 *
 * @example
 * ```ts
 * const warehouseCursor = createCursorQuery(warehouseQuery);
 * type WarehouseCursorInput = InferCursorInput<typeof warehouseCursor>;
 * // { limit: number; direction: "forward" | "backward"; cursor?: string; where?: ...; order?: ... }
 * ```
 */
export type InferCursorInput<Q> = Q extends CursorQueryBuilder<
  infer _T,
  infer _Fields,
  infer InferredFields,
  infer _Types
>
  ? CursorQueryInput<InferredFields>
  : never;

// =============================================================================
// Query Input builder helpers
// =============================================================================

/**
 * Create a typed query input object for a FluentQueryBuilder
 *
 * This is a runtime identity function that provides type checking.
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 *
 * const input = queryInput(warehouseQuery, {
 *   where: { name: { $contains: "main" } },
 *   order: ["createdAt:desc"],
 *   limit: 10,
 * });
 * ```
 */
export function queryInput<Q extends FluentQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>>(
  _query: Q,
  input: InferExecuteOptions<Q>
): InferExecuteOptions<Q> {
  return input;
}

/**
 * Create a typed where object for a query builder
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 *
 * const where = queryWhere(warehouseQuery, {
 *   name: { $contains: "main" },
 *   isDefault: true,
 * });
 * ```
 */
export function queryWhere<Q extends FluentQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>>(
  _query: Q,
  where: InferWhere<Q>
): InferWhere<Q> {
  return where;
}

/**
 * Create a typed order array for a query builder
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 *
 * const order = queryOrder(warehouseQuery, ["createdAt:desc", "name:asc"]);
 * ```
 */
export function queryOrder<Q extends FluentQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>>(
  _query: Q,
  order: InferOrder<Q>
): InferOrder<Q> {
  return order;
}

/**
 * Create a typed relay input for a RelayQueryBuilder
 *
 * @example
 * ```ts
 * const warehouseRelay = createRelayQuery(warehouseQuery);
 *
 * const input = relayInput(warehouseRelay, {
 *   first: 10,
 *   where: { isDefault: true },
 *   order: ["createdAt:desc"],
 * });
 * ```
 */
export function relayInput<
  Q extends RelayQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>,
>(
  _query: Q,
  input: InferRelayInput<Q>
): InferRelayInput<Q> {
  return input;
}

/**
 * Create a typed cursor input for a CursorQueryBuilder
 *
 * @example
 * ```ts
 * const warehouseCursor = createCursorQuery(warehouseQuery);
 *
 * const input = cursorInput(warehouseCursor, {
 *   limit: 10,
 *   direction: "forward",
 *   where: { isDefault: true },
 * });
 * ```
 */
export function cursorInput<
  Q extends CursorQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>,
>(
  _query: Q,
  input: InferCursorInput<Q>
): InferCursorInput<Q> {
  return input;
}
