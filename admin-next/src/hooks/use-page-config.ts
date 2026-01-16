"use client";

import { useState, useMemo, useCallback, RefObject } from "react";
import type { AgGridReact } from "ag-grid-react";
import type { SortDirection as AgSortDirection } from "ag-grid-community";
import {
  useFilters,
  FilterOperator,
  type IFilterSchema,
  type IFilterValue,
} from "@/layouts/filters";
import { useGridState } from "./use-grid-state";
import { useGridSort, type SortModel } from "./use-grid-sort";

// ============================================
// Types
// ============================================

/**
 * GraphQL sort direction enum
 */
export enum SortDirection {
  Asc = "ASC",
  Desc = "DESC",
}

/**
 * Generic GraphQL orderBy input
 */
export interface OrderByInput<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

/**
 * Sort field mapping - maps AG Grid column ID to GraphQL field
 */
export type SortFieldMapping<TField extends string = string> = Record<string, TField>;

/**
 * Custom filter transformer for special cases
 * Return null to skip the filter, undefined to use default handling
 */
export type FilterTransformer<TWhereInput> = (
  filter: IFilterValue,
  gqlOperator: string
) => Partial<TWhereInput> | null | undefined;

/**
 * Configuration for usePageConfig hook
 */
export interface UsePageConfigOptions<
  TData,
  TWhereInput extends Record<string, unknown>,
  TOrderField extends string,
> {
  /** Grid ref for programmatic control */
  gridRef: RefObject<AgGridReact<TData> | null>;

  /** Unique key for localStorage persistence */
  storageKey: string;

  /** Filter schema definition */
  filterSchema: IFilterSchema[];

  /** Map AG Grid column IDs to GraphQL order field enum values */
  sortFieldMapping: SortFieldMapping<TOrderField>;

  /** Default sort configuration */
  defaultSort?: SortModel[];

  /** Default page size */
  defaultPageSize?: number;

  /** Search field name for building where clause (e.g., 'originalName', 'name') */
  searchField?: string;

  /** Custom filter transformers for special handling */
  filterTransformers?: Record<string, FilterTransformer<TWhereInput>>;

  /** Custom search condition builder */
  buildSearchCondition?: (search: string) => Partial<TWhereInput>;
}

/**
 * Return type for usePageConfig hook
 */
export interface UsePageConfigReturn<
  TWhereInput extends Record<string, unknown>,
  TOrderField extends string,
> {
  // ---- State Values ----
  /** Current search value */
  searchValue: string;
  /** Current page size */
  pageSize: number;
  /** Current sort model */
  sortModel: SortModel[];
  /** Current filter values */
  filters: IFilterValue[];

  // ---- GraphQL Variables ----
  /** Converted GraphQL where input (filters + search combined) */
  where: TWhereInput | undefined;
  /** Converted GraphQL orderBy input */
  orderBy: OrderByInput<TOrderField>[] | undefined;

  // ---- Setters ----
  /** Set search value */
  setSearchValue: (value: string) => void;
  /** Set page size */
  setPageSize: (size: number) => void;
  /** Set sort model */
  setSortModel: (model: SortModel[]) => void;
  /** Set filters */
  setFilters: (filters: IFilterValue[]) => void;
  /** Reset all state */
  reset: () => void;

  // ---- Component Props ----
  /** Props to spread to FilterWidget */
  filterWidgetProps: {
    options: IFilterSchema[];
    value: IFilterValue[];
    onChange: (filters: IFilterValue[]) => void;
    searchProps: {
      searchValue: string;
      onChangeSearchValue: (value: string) => void;
    };
  };

  /** Props related to grid state persistence */
  gridStateProps: {
    initialState: ReturnType<typeof useGridState>["initialState"];
    onStateUpdated: ReturnType<typeof useGridState>["onStateUpdated"];
  };

  /** Callback for AG Grid onSortChanged */
  onSortChanged: ReturnType<typeof useGridSort>["onSortChanged"];
}

// ============================================
// Operator Mapping
// ============================================

/**
 * Map FilterOperator to GraphQL operator string
 */
const operatorToGraphQL: Record<FilterOperator, string> = {
  [FilterOperator.Eq]: "_eq",
  [FilterOperator.NotEq]: "_neq",
  [FilterOperator.Gt]: "_gt",
  [FilterOperator.Gte]: "_gte",
  [FilterOperator.Lt]: "_lt",
  [FilterOperator.Lte]: "_lte",
  [FilterOperator.In]: "_in",
  [FilterOperator.NotIn]: "_notIn",
  [FilterOperator.Like]: "_contains",
  [FilterOperator.NotLike]: "_notContains",
  [FilterOperator.ILike]: "_containsi",
  [FilterOperator.NotILike]: "_notContainsi",
  [FilterOperator.Is]: "_is",
  [FilterOperator.IsNot]: "_isNot",
  [FilterOperator.Between]: "_between",
};

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a filter value is empty and should be skipped
 */
function isEmptyFilterValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Convert AG Grid sort direction to GraphQL SortDirection
 */
function toGqlSortDirection(sort: AgSortDirection): SortDirection {
  return sort === "asc" ? SortDirection.Asc : SortDirection.Desc;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Universal hook for managing page configuration (filters, sorting, search, pagination)
 *
 * @example
 * ```tsx
 * const {
 *   where,
 *   orderBy,
 *   searchValue,
 *   pageSize,
 *   filterWidgetProps,
 *   gridStateProps,
 *   onSortChanged,
 * } = usePageConfig({
 *   gridRef,
 *   storageKey: "media-grid-state",
 *   filterSchema,
 *   sortFieldMapping: {
 *     originalName: FileOrderField.OriginalName,
 *     createdAt: FileOrderField.CreatedAt,
 *   },
 *   defaultSort: [{ colId: "createdAt", sort: "desc" }],
 *   searchField: "originalName",
 * });
 *
 * const { files } = useFiles({ where, orderBy, search: searchValue, first: pageSize });
 *
 * <FilterWidget {...filterWidgetProps} />
 * <AgGridReact {...gridStateProps} onSortChanged={onSortChanged} />
 * ```
 */
export function usePageConfig<
  TData,
  TWhereInput extends Record<string, unknown>,
  TOrderField extends string,
>(
  options: UsePageConfigOptions<TData, TWhereInput, TOrderField>
): UsePageConfigReturn<TWhereInput, TOrderField> {
  const {
    gridRef,
    storageKey,
    filterSchema,
    sortFieldMapping,
    defaultSort = [],
    defaultPageSize = 20,
    searchField,
    filterTransformers = {},
    buildSearchCondition,
  } = options;

  // ---- Local State ----
  const [searchValue, setSearchValue] = useState("");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortModel, setSortModel] = useState<SortModel[]>(defaultSort);

  // ---- Filters ----
  const { widgetProps, filters, setFilters, reset: resetFilters } = useFilters({
    schema: filterSchema,
  });

  // ---- Grid State Persistence ----
  const { initialState, onStateUpdated } = useGridState({ storageKey });

  // ---- Grid Sort ----
  const { onSortChanged } = useGridSort({
    gridRef,
    sortModel,
    onSortChange: setSortModel,
  });

  // ---- Convert Sort to GraphQL ----
  const orderBy = useMemo((): OrderByInput<TOrderField>[] | undefined => {
    if (sortModel.length === 0) return undefined;

    const result = sortModel
      .map((sort) => {
        const field = sortFieldMapping[sort.colId];
        if (!field) return null;
        return {
          field,
          direction: toGqlSortDirection(sort.sort),
        };
      })
      .filter((item): item is OrderByInput<TOrderField> => item !== null);

    return result.length > 0 ? result : undefined;
  }, [sortModel, sortFieldMapping]);

  // ---- Convert Filters to GraphQL ----
  const where = useMemo((): TWhereInput | undefined => {
    const conditions: Partial<TWhereInput>[] = [];

    // Add search condition
    if (searchValue && searchValue.trim()) {
      const trimmedSearch = searchValue.trim();

      if (buildSearchCondition) {
        // Use custom search condition builder
        conditions.push(buildSearchCondition(trimmedSearch));
      } else if (searchField) {
        // Default: case-insensitive contains
        conditions.push({
          [searchField]: { _containsi: trimmedSearch },
        } as Partial<TWhereInput>);
      }
    }

    // Add filter conditions
    for (const filter of filters) {
      // Skip empty values
      if (isEmptyFilterValue(filter.value)) continue;

      const gqlOperator = operatorToGraphQL[filter.operator];

      // Check for custom transformer
      const transformer = filterTransformers[filter.payloadKey];
      if (transformer) {
        const customResult = transformer(filter, gqlOperator);
        if (customResult === null) continue; // Skip this filter
        if (customResult !== undefined) {
          conditions.push(customResult);
          continue;
        }
        // undefined means use default handling
      }

      // Handle date range (Between operator)
      if (filter.operator === FilterOperator.Between && Array.isArray(filter.value)) {
        const [start, end] = filter.value;
        if (!start && !end) continue;

        const dateCondition: Record<string, unknown> = {};
        if (start) dateCondition._gte = start;
        if (end) dateCondition._lte = end;

        conditions.push({
          [filter.payloadKey]: dateCondition,
        } as Partial<TWhereInput>);
        continue;
      }

      // Handle In operator with array values
      if (filter.operator === FilterOperator.In && Array.isArray(filter.value)) {
        const nonEmptyValues = filter.value.filter(
          (v) => v !== null && v !== undefined && v !== ""
        );
        if (nonEmptyValues.length === 0) continue;

        conditions.push({
          [filter.payloadKey]: { _in: nonEmptyValues },
        } as Partial<TWhereInput>);
        continue;
      }

      // Standard operator handling
      conditions.push({
        [filter.payloadKey]: {
          [gqlOperator]: filter.value,
        },
      } as Partial<TWhereInput>);
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0] as unknown as TWhereInput;
    return { _and: conditions } as unknown as TWhereInput;
  }, [searchValue, searchField, buildSearchCondition, filters, filterTransformers]);

  // ---- Reset All ----
  const reset = useCallback(() => {
    setSearchValue("");
    setPageSize(defaultPageSize);
    setSortModel(defaultSort);
    resetFilters();
  }, [defaultPageSize, defaultSort, resetFilters]);

  // ---- Build Component Props ----
  const filterWidgetProps = useMemo(
    () => ({
      ...widgetProps,
      searchProps: {
        searchValue,
        onChangeSearchValue: setSearchValue,
      },
    }),
    [widgetProps, searchValue]
  );

  const gridStateProps = useMemo(
    () => ({
      initialState,
      onStateUpdated,
    }),
    [initialState, onStateUpdated]
  );

  return {
    // State
    searchValue,
    pageSize,
    sortModel,
    filters,

    // GraphQL variables
    where,
    orderBy,

    // Setters
    setSearchValue,
    setPageSize,
    setSortModel,
    setFilters,
    reset,

    // Component props
    filterWidgetProps,
    gridStateProps,
    onSortChanged,
  };
}

// ============================================
// Helper: Create Filter Transformer
// ============================================

/**
 * Create a transformer for enum fields that need startsWith matching
 * (e.g., mimeType where "image" should match "image/png", "image/jpeg", etc.)
 */
export function createStartsWithTransformer<TWhereInput extends Record<string, unknown>>(
  fieldName: string
): FilterTransformer<TWhereInput> {
  return (filter) => {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const nonEmptyValues = values.filter(
      (v) => v !== null && v !== undefined && v !== ""
    );

    if (nonEmptyValues.length === 0) return null;

    const conditions = nonEmptyValues.map((v) => ({
      [fieldName]: { _startsWithi: String(v) },
    }));

    if (conditions.length === 1) {
      return conditions[0] as unknown as Partial<TWhereInput>;
    }

    return { _or: conditions } as unknown as Partial<TWhereInput>;
  };
}

/**
 * Create a transformer that maps filter values before sending
 * (e.g., transform UI labels to API enum values)
 */
export function createValueMapTransformer<TWhereInput extends Record<string, unknown>>(
  fieldName: string,
  valueMap: Record<string, unknown>
): FilterTransformer<TWhereInput> {
  return (filter, gqlOperator) => {
    const mapValue = (v: unknown): unknown => {
      const mapped = valueMap[String(v)];
      return mapped !== undefined ? mapped : v;
    };

    const value = Array.isArray(filter.value)
      ? filter.value.map(mapValue)
      : mapValue(filter.value);

    return {
      [fieldName]: { [gqlOperator]: value },
    } as Partial<TWhereInput>;
  };
}
