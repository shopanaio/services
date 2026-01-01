import { TreeItems } from '@components/sortableTree/types';
import { IMenuLink } from '@src/entity/Menu/Link';
import { IProductFilter } from '@src/entity/ProductFilter/ProductFilter';
import { MenuNodeType } from '@src/graphql';

export const NAVIGATION_TABS = {
  FILTERS: 'filters',
  MENU: 'menu',
};

export const defaultFilterFormValues = {
  filters: [] as IProductFilter[],
};
