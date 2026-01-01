import { FilterOperators, FilterValueType } from '@src/entity/Filter/enums';
import { FilterType } from '@src/graphql';

export interface IFilterOperator {
  label: string;
  value: FilterOperators;
}

export interface IFilter {
  // id: string;
  label: string;
  value: string | string[];
  operator: IFilterOperator;
  type: FilterType;
  valueType: FilterValueType;
}

export interface IFilterProperty {
  valueType: FilterValueType;
  type: string;
  label: string;
  operators: IFilterOperator[];
}
