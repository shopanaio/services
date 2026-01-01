import { FilterOperators } from '@src/entity/Filter/enums';

export const Filters = {
  eq: {
    label: 'is equal to',
    value: 'eq',
  },
  notEq: {
    label: 'is not equal to',
    value: 'notEq',
  },
  gt: {
    label: 'is greater than',
    value: 'gt',
  },
  gte: {
    label: 'is greater than or equal to',
    value: 'gte',
  },
  lt: {
    label: 'is less than',
    value: 'lt',
  },
  lte: {
    label: 'is less than or equal to',
    value: 'lte',
  },
  in: {
    label: 'is one of',
    value: 'in',
  },
  notIn: {
    label: 'is not one of',
    value: 'notIn',
  },
  like: {
    label: 'contains',
    value: 'like',
  },
  notLike: {
    label: 'does not contain',
    value: 'notLike',
  },
  is: {
    label: 'is equal to',
    value: 'is',
  },
  isNot: {
    label: 'is not equal to',
    value: 'isNot',
  },
};

export const operators = {
  [FilterOperators.Eq]: {
    label: 'is equal to',
    value: FilterOperators.Eq,
  },
  [FilterOperators.NotEq]: {
    label: 'is not equal to',
    value: FilterOperators.NotEq,
  },
  [FilterOperators.Gt]: {
    label: 'is greater than',
    value: FilterOperators.Gt,
  },
  [FilterOperators.Gte]: {
    label: 'is greater than or equal to',
    value: FilterOperators.Gte,
  },
  [FilterOperators.Lt]: {
    label: 'is less than',
    value: FilterOperators.Lt,
  },
  [FilterOperators.Lte]: {
    label: 'is less than or equal to',
    value: FilterOperators.Lte,
  },
  [FilterOperators.In]: {
    label: 'is one of',
    value: FilterOperators.In,
  },
  [FilterOperators.NotIn]: {
    label: 'is not one of',
    value: FilterOperators.NotIn,
  },
  [FilterOperators.Like]: {
    label: 'contains',
    value: FilterOperators.Like,
  },
  [FilterOperators.NotLike]: {
    label: 'does not contain',
    value: FilterOperators.NotLike,
  },
  [FilterOperators.ILike]: {
    label: 'contains',
    value: FilterOperators.Like,
  },
  [FilterOperators.NotILike]: {
    label: 'does not contain',
    value: FilterOperators.NotLike,
  },
  [FilterOperators.Is]: {
    label: 'is equal to',
    value: FilterOperators.Is,
  },
  [FilterOperators.IsNot]: {
    label: 'is not equal to',
    value: FilterOperators.IsNot,
  },
  [FilterOperators.Between]: {
    label: 'is between',
    value: FilterOperators.Between,
  },
};
