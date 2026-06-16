import { FilterOperator, IFilterOption } from './types';

/**
 * Operator presets for different filter types
 */

/** Operators for number fields */
export const numberOperators: FilterOperator[] = [
  FilterOperator.Eq,
  FilterOperator.Gt,
  FilterOperator.Gte,
  FilterOperator.Lt,
  FilterOperator.Lte,
];

/** Operators for string fields */
export const stringOperators: FilterOperator[] = [
  FilterOperator.ILike,
];

/** Operators for date fields */
export const dateOperators: FilterOperator[] = [
  FilterOperator.Between,
];

/** Operators for enum/constant fields */
export const enumOperators: FilterOperator[] = [
  FilterOperator.In,
];

/** Operators for boolean fields */
export const booleanOperators: FilterOperator[] = [
  FilterOperator.Is,
  FilterOperator.IsNot,
];

/** Operators for relation fields */
export const relationOperators: FilterOperator[] = [
  FilterOperator.In,
];

/** Operators for price fields (same as number) */
export const priceOperators: FilterOperator[] = numberOperators;

/** Operators for translatable fields (same as string) */
export const translatableOperators: FilterOperator[] = stringOperators;

/** Operators for locale fields */
export const localeOperators: FilterOperator[] = [
  FilterOperator.Is,
];

/**
 * Boolean filter options
 */
export const booleanOptions: IFilterOption[] = [
  { label: 'True', value: true },
  { label: 'False', value: false },
];

/**
 * Null filter options
 */
export const nullOptions: IFilterOption[] = [
  { label: 'Null', value: null },
  { label: 'Not Null', value: 'NOT_NULL' },
];
