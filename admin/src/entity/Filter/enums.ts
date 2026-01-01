export enum FilterConstantValue {
  True = 'True',
  False = 'False',
  Null = 'Null',
}

export enum FilterValueType {
  String = 'string',
  Number = 'number',
  Date = 'date',
  Constant = 'constant',
  Relation = 'relation',
}

export enum FilterOperators {
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
  Between = 'Between',
}
