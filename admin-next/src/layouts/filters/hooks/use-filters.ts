'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  IFilterSchema,
  IFilterValue,
  IFilterAdapter,
  IUseFiltersOptions,
  IUseFiltersReturn,
} from '../core/types';

/**
 * Hook for managing filter state
 *
 * @example
 * // Basic usage without adapter
 * const filters = useFilters({ schema: productFilterSchema });
 *
 * @example
 * // With custom adapter
 * const filters = useFilters({
 *   schema: productFilterSchema,
 *   adapter: myGraphQLAdapter,
 * });
 *
 * // Use payload in query
 * const { data } = useQuery(QUERY, { variables: { where: filters.payload } });
 */
export function useFilters<TPayload = unknown>(
  options: IUseFiltersOptions<IFilterAdapter<TPayload>>,
): IUseFiltersReturn<TPayload> {
  const { schema, initialFilters = [], adapter, onChange: onChangeCallback } = options;

  const [filters, setFiltersState] = useState<IFilterValue[]>(initialFilters);

  // Set filters with callback
  const setFilters = useCallback(
    (newFilters: IFilterValue[]) => {
      setFiltersState(newFilters);
      onChangeCallback?.(newFilters);
    },
    [onChangeCallback],
  );

  // Add a new filter
  const addFilter = useCallback(
    (filter: IFilterValue) => {
      const newFilters = [...filters, filter];
      setFilters(newFilters);
    },
    [filters, setFilters],
  );

  // Remove filter by index
  const removeFilter = useCallback(
    (index: number) => {
      const newFilters = filters.filter((_, i) => i !== index);
      setFilters(newFilters);
    },
    [filters, setFilters],
  );

  // Update filter at index
  const updateFilter = useCallback(
    (index: number, updates: Partial<IFilterValue>) => {
      const newFilters = filters.map((filter, i) =>
        i === index ? { ...filter, ...updates } : filter,
      );
      setFilters(newFilters);
    },
    [filters, setFilters],
  );

  // Reset all filters
  const reset = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters, setFilters]);

  // Find schema by key path
  const findSchema = useCallback(
    (keyPath: string[]): IFilterSchema | null => {
      let current: IFilterSchema[] = schema;
      let result: IFilterSchema | null = null;

      for (const key of keyPath) {
        const found = current.find((s) => s.key === key);
        if (!found) return null;
        result = found;
        current = found.children || [];
      }

      return result;
    },
    [schema],
  );

  // Build payload using adapter
  const payload = useMemo<TPayload | null>(() => {
    if (!adapter) return null;

    const converted = filters
      .map((filter) => {
        const filterSchema = findSchema(filter.keyPath);
        return adapter.convert(filter, filterSchema);
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (converted.length === 0) return null;

    const combined = adapter.combine(converted, 'AND');
    return adapter.build(combined) as TPayload;
  }, [adapter, filters, findSchema]);

  // Widget props for easy integration
  const widgetProps = useMemo(
    () => ({
      options: schema,
      value: filters,
      onChange: setFilters,
    }),
    [schema, filters, setFilters],
  );

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    updateFilter,
    reset,
    widgetProps,
    payload,
  };
}

/**
 * Simple hook for filter state without adapter
 * Use this when you just need state management
 */
export function useFilterState(schema: IFilterSchema[]) {
  return useFilters({ schema });
}
