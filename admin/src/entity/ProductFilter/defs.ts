import { FilterType } from '@src/graphql';

export const productFilters = {
  [FilterType.Availability]: {
    label: 'Availability',
    type: FilterType.Availability,
  },
  [FilterType.Category]: {
    label: 'Category',
    type: FilterType.Category,
  },
  [FilterType.Feature]: {
    label: 'Feature',
    type: FilterType.Feature,
  },
  [FilterType.Price]: {
    label: 'Price',
    type: FilterType.Price,
  },
  [FilterType.Tag]: {
    label: 'Product tag',
    type: FilterType.Tag,
  },
  [FilterType.ProductType]: {
    label: 'Product type',
    type: FilterType.ProductType,
  },
};
