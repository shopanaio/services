import { FilterOperator, IOperatorMeta } from './types';

/**
 * Operator metadata map
 */
export const operatorsMeta: Record<FilterOperator, IOperatorMeta> = {
  [FilterOperator.Eq]: {
    value: FilterOperator.Eq,
    literal: '=',
    label: 'Is equal to',
  },
  [FilterOperator.NotEq]: {
    value: FilterOperator.NotEq,
    literal: '!=',
    label: 'Is not equal to',
  },
  [FilterOperator.Gt]: {
    value: FilterOperator.Gt,
    literal: '>',
    label: 'Is greater than',
  },
  [FilterOperator.Gte]: {
    value: FilterOperator.Gte,
    literal: '>=',
    label: 'Is greater than or equal to',
  },
  [FilterOperator.Lt]: {
    value: FilterOperator.Lt,
    literal: '<',
    label: 'Is less than',
  },
  [FilterOperator.Lte]: {
    value: FilterOperator.Lte,
    literal: '<=',
    label: 'Is less than or equal to',
  },
  [FilterOperator.In]: {
    value: FilterOperator.In,
    literal: 'in',
    label: 'Is one of',
  },
  [FilterOperator.NotIn]: {
    value: FilterOperator.NotIn,
    literal: 'not in',
    label: 'Is not one of',
  },
  [FilterOperator.Like]: {
    value: FilterOperator.Like,
    literal: 'matches',
    label: 'Contains',
  },
  [FilterOperator.NotLike]: {
    value: FilterOperator.NotLike,
    literal: 'not matches',
    label: 'Does not contain',
  },
  [FilterOperator.ILike]: {
    value: FilterOperator.ILike,
    literal: 'matches',
    label: 'Contains (case-insensitive)',
  },
  [FilterOperator.NotILike]: {
    value: FilterOperator.NotILike,
    literal: 'not matches',
    label: 'Does not contain (case-insensitive)',
  },
  [FilterOperator.Is]: {
    value: FilterOperator.Is,
    literal: 'is',
    label: 'Is',
  },
  [FilterOperator.IsNot]: {
    value: FilterOperator.IsNot,
    literal: 'is not',
    label: 'Is not',
  },
  [FilterOperator.Between]: {
    value: FilterOperator.Between,
    literal: '<>',
    label: 'Is between',
  },
};

/**
 * Get operator metadata
 */
export const getOperatorMeta = (operator: FilterOperator): IOperatorMeta => {
  return operatorsMeta[operator];
};

/**
 * Check if operator expects multiple values
 */
export const isMultipleValueOperator = (operator: FilterOperator): boolean => {
  return [FilterOperator.In, FilterOperator.NotIn].includes(operator);
};

/**
 * Check if operator is a range operator
 */
export const isRangeOperator = (operator: FilterOperator): boolean => {
  return operator === FilterOperator.Between;
};
