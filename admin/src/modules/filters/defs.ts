import { IProductFilter } from '@src/entity/ProductFilter/ProductFilter';

export const NAVIGATION_TABS = {
  FILTERS: 'filters',
  MENU: 'menu',
};

export const defaultFilterFormValues = {
  filters: [] as IProductFilter[],
};
