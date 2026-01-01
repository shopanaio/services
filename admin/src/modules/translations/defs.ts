import { TreeItems } from '@components/sortableTree/types';
import { IProductFilter } from '@src/entity/ProductFilter/ProductFilter';
import { TranslationField } from '@src/graphql';

export const NAVIGATION_TABS = {
  FILTERS: 'filters',
  MENU: 'menu',
};

export const defaultFilterFormValues = {
  filters: [] as IProductFilter[],
};

export const defaultMenuFormValues = {
  menuItems: [] as TreeItems,
  slug: '' as string,
  title: '' as string,
};

export const allInformationFieldNames = [
  TranslationField.Title,
  TranslationField.DescriptionJson,
  TranslationField.ExcerptText,
  TranslationField.SeoTitle,
  TranslationField.SeoDescription,
];
