/**
 * Universal Filter System
 *
 * A flexible, adapter-based filter system that can be used with any API.
 *
 * @example
 * // 1. Define filter schema for your entity
 * const productFilterSchema: IFilterSchema[] = [
 *   {
 *     key: 'status',
 *     label: 'Status',
 *     type: FilterType.Enum,
 *     operators: enumOperators,
 *     payloadKey: 'status',
 *     options: [
 *       { label: 'Active', value: 'active' },
 *       { label: 'Draft', value: 'draft' },
 *     ],
 *   },
 *   {
 *     key: 'price',
 *     label: 'Price',
 *     type: FilterType.Number,
 *     operators: numberOperators,
 *     payloadKey: 'variants.price',
 *   },
 * ];
 *
 * // 2. Create your adapter (project-specific)
 * const myAdapter: IFilterAdapter = {
 *   name: 'graphql',
 *   convert: (filter, schema) => ({ [filter.payloadKey]: { [filter.operator]: filter.value } }),
 *   combine: (filters, logic) => ({ [logic]: filters }),
 *   build: (combined) => combined,
 * };
 *
 * // 3. Use in component
 * function ProductsPage() {
 *   const filters = useFilters({
 *     schema: productFilterSchema,
 *     adapter: myAdapter,
 *   });
 *
 *   // Use filters.payload in your API query
 *   // Use filters.widgetProps in FilterWidget
 *
 *   return (
 *     <FilterWidget
 *       {...filters.widgetProps}
 *       searchProps={{ searchValue, onChangeSearchValue }}
 *     />
 *   );
 * }
 *
 * // 4. Register relation controls (optional)
 * relationControlRegistry.register('Category', CategorySelect);
 */

// Core types and utilities
export {
  // Types
  FilterType,
  FilterOperator,
  type IFilterSchema,
  type IFilterValue,
  type IFilterOption,
  type IOperatorMeta,
  type IFilterAdapter,
  type IUseFiltersOptions,
  type IUseFiltersReturn,
  type IRelationControlProps,
  type RelationControlComponent,
} from './core/types';

// Operators
export {
  operatorsMeta,
  getOperatorMeta,
  isMultipleValueOperator,
  isRangeOperator,
} from './core/operators';

// Operator presets
export {
  numberOperators,
  stringOperators,
  dateOperators,
  enumOperators,
  booleanOperators,
  relationOperators,
  priceOperators,
  translatableOperators,
  localeOperators,
  booleanOptions,
  nullOptions,
} from './core/constants';

// Components
export {
  FilterWidget,
  FilterValueControl,
  RelationControl,
  relationControlRegistry,
  type IFilterWidgetProps,
  type IFilterWidgetSearchProps,
  type IFilterValueControlProps,
} from './components';

// Hooks
export { useFilters, useFilterState } from './hooks';

// Utils
export { findFilter, findFilterByPayloadKey } from './utils';
