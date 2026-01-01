import { operators } from '@src/entity/Filter/defs';
import { FilterValueType } from '@src/entity/Filter/enums';
import { IFilterProperty } from '@src/entity/Filter/types';
import { productFilters } from '@src/entity/ProductFilter/defs';

export const listingFilters = {
  [productFilters.AVAILABILITY.type]: {
    ...productFilters.AVAILABILITY,
    operators: [operators.Eq, operators.In],
    valueType: FilterValueType.String,
  } as IFilterProperty,
  [productFilters.CATEGORY.type]: {
    ...productFilters.CATEGORY,
    operators: [operators.Eq, operators.In],
    valueType: FilterValueType.Relation,
  } as IFilterProperty,
  [productFilters.FEATURE.type]: {
    ...productFilters.FEATURE,
    operators: [operators.Eq, operators.In],
    valueType: FilterValueType.Relation,
  } as IFilterProperty,
  [productFilters.PRICE.type]: {
    operators: [operators.Between],
    valueType: FilterValueType.Number,
    ...productFilters.PRICE,
  } as IFilterProperty,
  [productFilters.TAG.type]: {
    ...productFilters.TAG,
    operators: [operators.Eq, operators.In],
    valueType: FilterValueType.Relation,
  } as IFilterProperty,
};

export const emptyFilter = {
  key: null,
  operator: null,
  type: null,
  value: null,
  valueType: null,
  label: null,
};
