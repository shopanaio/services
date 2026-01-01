import { Entity } from '@src/defs/entities';

export enum UiFilterConstant {
  True = 'True',
  False = 'False',
  Null = 'Null',
}

export enum UiFilterType {
  String = 'String',
  Number = 'Number',
  Date = 'Date',
  DateRange = 'DateRange',
  IsConstant = 'IsConstant',
  Relation = 'Relation',
  Price = 'Price',
  Weight = 'Weight',
  Any = 'Any',
  Boolean = 'Boolean',
  Integer = 'Integer',
  Translatable = 'Translatable',
  Locale = 'Locale',
}

export enum UiFilterOperator {
  Eq = 'Eq',
  Gt = 'Gt',
  Gte = 'Gte',
  ILike = 'ILike',
  In = 'In',
  Is = 'Is',
  IsNot = 'IsNot',
  Like = 'Like',
  Lt = 'Lt',
  Lte = 'Lte',
  NotEq = 'NotEq',
  NotILike = 'NotILike',
  NotIn = 'NotIn',
  NotLike = 'NotLike',
  // custom types
  Between = 'Between',
}

export type UiFilterComparable =
  | UiFilterType.String
  | UiFilterType.Number
  | UiFilterType.Date;

export interface IUiFilterValue {
  label: string;
  entity?: string;
  operator: UiFilterOperator;
  type: UiFilterType;
  value: any | any[];
  keyPath: string[]; // keys for Cascader component
  payloadKey: string; // keys for payload
  fixed?: boolean;
}

export type IUiFilter = {
  children?: IUiFilter[];
  entity?: Entity;
  key: string; // key for Cascader component
  label: JSX.Element | string;
  operators: UiFilterOperator[];
  options?: { label: JSX.Element | string; value: any }[];
  type: UiFilterType;
  payloadKey: string;
  description?: JSX.Element | string;
  fixed?: boolean;
};

export interface IUiFilterOperator {
  label: string;
  value: UiFilterOperator;
}

export const operators = {
  [UiFilterOperator.Eq]: {
    literal: '=',
    label: 'Is equal to',
    value: UiFilterOperator.Eq,
  },
  [UiFilterOperator.NotEq]: {
    literal: '!=',
    label: 'Is not equal to',
    value: UiFilterOperator.NotEq,
  },
  [UiFilterOperator.Gt]: {
    literal: '>',
    label: 'Is greater than',
    value: UiFilterOperator.Gt,
  },
  [UiFilterOperator.Gte]: {
    literal: '>=',
    label: 'Is greater than or equal to',
    value: UiFilterOperator.Gte,
  },
  [UiFilterOperator.Lt]: {
    literal: '<',
    label: 'Is less than',
    value: UiFilterOperator.Lt,
  },
  [UiFilterOperator.Lte]: {
    literal: '<=',
    label: 'Is less than or equal to',
    value: UiFilterOperator.Lte,
  },
  [UiFilterOperator.In]: {
    literal: 'in',
    label: 'Is one of',
    value: UiFilterOperator.In,
  },
  [UiFilterOperator.NotIn]: {
    literal: 'not in',
    label: 'Is not one of',
    value: UiFilterOperator.NotIn,
  },
  [UiFilterOperator.Like]: {
    literal: 'matches',
    label: 'Contains',
    value: UiFilterOperator.Like,
  },
  [UiFilterOperator.NotLike]: {
    literal: 'not matches',
    label: 'Does not match',
    value: UiFilterOperator.NotLike,
  },
  [UiFilterOperator.ILike]: {
    literal: 'matches',
    label: 'matches',
    value: UiFilterOperator.ILike,
  },
  [UiFilterOperator.NotILike]: {
    literal: 'not matches',
    label: 'not matches',
    value: UiFilterOperator.NotILike,
  },
  [UiFilterOperator.Is]: {
    literal: 'is',
    label: 'is',
    value: UiFilterOperator.Is,
  },
  [UiFilterOperator.IsNot]: {
    literal: 'is not',
    label: 'is not',
    value: UiFilterOperator.IsNot,
  },
  [UiFilterOperator.Between]: {
    literal: '<>',
    label: 'between',
    value: UiFilterOperator.Between,
  },
};

export const uiNumberFilterOperators = [
  UiFilterOperator.Eq,
  UiFilterOperator.Gt,
  UiFilterOperator.Gte,
  UiFilterOperator.Lt,
  UiFilterOperator.Lte,
];

export const uiStringFilterOperators = [
  // UiFilterOperator.Eq,
  UiFilterOperator.ILike,
];

export const uiDateFilterOperators = [
  UiFilterOperator.Between,
  // UiFilterOperator.Eq,
  // UiFilterOperator.NotEq,
  // UiFilterOperator.Gt,
  // UiFilterOperator.Gte,
  // UiFilterOperator.Lt,
  // UiFilterOperator.Lte,
];

export const uiConstantFilterOperators = [
  // UiFilterOperator.Eq,
  UiFilterOperator.In,
];

export const uiBooleanFilterOperators = [
  UiFilterOperator.Is,
  UiFilterOperator.IsNot,
];
export const uiNullFilterOperators = [UiFilterOperator.Is];

export const uiRelationFilterOperators = [
  // UiFilterOperator.Eq,
  UiFilterOperator.In,
];

export const uiPriceFilterOperators = uiNumberFilterOperators;
export const uiTranslatableFilterOperators = uiStringFilterOperators;
export const uiLocaleFilterOperators = [UiFilterOperator.Is];

export const uiOperatorsByType = {
  [UiFilterType.String]: uiStringFilterOperators,
  [UiFilterType.Number]: uiNumberFilterOperators,
  [UiFilterType.Date]: uiDateFilterOperators,
  [UiFilterType.DateRange]: [],
  [UiFilterType.IsConstant]: uiConstantFilterOperators,
  [UiFilterType.Relation]: uiRelationFilterOperators,
  [UiFilterType.Price]: uiPriceFilterOperators,
  [UiFilterType.Weight]: uiPriceFilterOperators,
  [UiFilterType.Any]: [],
};

export const uiBooleanFilterOptions = [
  { label: 'True', value: UiFilterConstant.True },
  { label: 'False', value: UiFilterConstant.False },
];

export type IUiFilterSearchProperty = {
  key: string;
  type:
    | UiFilterType.String
    | UiFilterType.Integer
    | UiFilterType.Number
    | UiFilterType.Translatable;
};
