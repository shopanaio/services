import { IProductFormValues } from '@modules/products/types';
import {
  StockStatuses,
  entityStatuses,
  stockStatuses,
  entityStatusMessageIds,
} from '@src/defs/constants';
import { Entity } from '@src/defs/entities';
import { IProduct } from '@src/entity/Product/Product';
import { UiFilter } from '@src/entity/UiFilter';
import {
  DimensionUnit,
  EntityStatus,
  ListingSort,
  WeightUnit,
} from '@src/graphql';
import { useIntl, FormattedMessage } from 'react-intl';

export const ClientProductSortOptions = {
  [ListingSort.CreatedAtDesc]: {
    key: ListingSort.CreatedAtDesc,
    label: <FormattedMessage id="products.sort.newest" />,
    onSort: (items: IProduct[]) => {
      return [...items].sort((a, b) => {
        if (!a.createdAt || !b.createdAt) {
          return 0;
        }

        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    },
  },
  [ListingSort.CreatedAtAsc]: {
    key: ListingSort.CreatedAtAsc,
    label: <FormattedMessage id="products.sort.oldest" />,
    onSort: (items: IProduct[]) => {
      return [...items].sort((a, b) => {
        if (!a.createdAt || !b.createdAt) {
          return 0;
        }

        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    },
  },
  [ListingSort.TitleAsc]: {
    key: ListingSort.TitleAsc,
    label: <FormattedMessage id="products.sort.titleAsc" />,
    onSort: (items: IProduct[]) => {
      return [...items].sort((a, b) => {
        if (!a.title || !b.title) {
          return 0;
        }

        return a.title?.localeCompare(b.title);
      });
    },
  },
  [ListingSort.TitleDesc]: {
    key: ListingSort.TitleDesc,
    label: <FormattedMessage id="products.sort.titleDesc" />,
    onSort: (items: IProduct[]) => {
      return [...items].sort((a, b) => {
        return b?.title?.localeCompare(a?.title);
      });
    },
  },
  [ListingSort.PriceAsc]: {
    key: ListingSort.PriceAsc,
    label: <FormattedMessage id="products.sort.priceAsc" />,
    onSort: (items: IProduct[]) => {
      return [...items].sort((a, b) => {
        return a.price - b.price;
      });
    },
  },
  [ListingSort.PriceDesc]: {
    key: ListingSort.PriceDesc,
    label: <FormattedMessage id="products.sort.priceDesc" />,
    onSort: (items: IProduct[]) => {
      return [...items].sort((a, b) => {
        return b.price - a.price;
      });
    },
  },
  [ListingSort.Custom]: {
    key: ListingSort.Custom,
    label: <FormattedMessage id="products.sort.custom" />,
    onSort: null,
  },
} as const;

export type TClientProductSortKey = keyof typeof ClientProductSortOptions;

export const productColumns = {
  title: {
    key: 'title',
    label: <FormattedMessage id="common.title" />,
    isFixed: true,
    width: 250,
    active: true,
  },
  status: {
    key: 'status',
    label: <FormattedMessage id="common.status" />,
    isFixed: true,
    width: 150,
    active: true,
  },
  price: {
    key: 'price',
    label: <FormattedMessage id="common.price" />,
    isFixed: true,
    width: 150,
    active: true,
  },
  oldPrice: {
    key: 'oldPrice',
    label: <FormattedMessage id="common.oldPrice" />,
    isFixed: false,
    width: 150,
    active: false,
  },
  costPrice: {
    key: 'costPrice',
    label: <FormattedMessage id="common.costPrice" />,
    isFixed: false,
    width: 150,
    active: false,
  },
  sku: {
    key: 'sku',
    label: <FormattedMessage id="product.inventory.sku.label" />,
    isFixed: false,
    width: 150,
    active: true,
  },
  stockStatus: {
    key: 'stockStatus',
    label: <FormattedMessage id="product.availability.stockStatus.label" />,
    isFixed: false,
    width: 150,
    active: true,
  },
  gallery: {
    key: 'gallery',
    label: <FormattedMessage id="common.gallery" />,
    isFixed: false,
    width: 150,
    active: false,
  },
  slug: {
    key: 'slug',
    label: <FormattedMessage id="common.slug" />,
    isFixed: false,
    width: 150,
    active: false,
  },
  categories: {
    key: 'categories',
    label: <FormattedMessage id="common.categories" />,
    isFixed: false,
    width: 150,
    active: false,
  },
  tags: {
    key: 'tags',
    label: <FormattedMessage id="common.tags" />,
    isFixed: false,
    width: 150,
    active: false,
  },

  createdAt: {
    key: 'createdAt',
    label: <FormattedMessage id="table.createdAt" />,
    isFixed: false,
    active: false,
    width: 150,
  },
  updatedAt: {
    key: 'updatedAt',
    label: <FormattedMessage id="table.updatedAt" />,
    isFixed: false,
    active: false,
    width: 150,
  },
};

export const searchOptions = {
  title: productColumns.title,
};

export const defaultProductFormValues: IProductFormValues = {
  id: '',
  attributes: [],
  categories: [],
  title: '',
  description: null,
  excerpt: '',
  cover: null,
  gallery: [],
  options: [],
  variants: [],
  price: 0,
  oldPrice: 0,
  primaryCategoryId: null,
  costPrice: 0,
  sku: '',
  slug: '',
  status: EntityStatus.Draft,
  tags: [],
  stockStatus: StockStatuses.IN_STOCK,
  weight: 0,
  requiresShipping: true,
  groups: [],
  weightUnit: WeightUnit.Gr,
  length: 0,
  width: 0,
  height: 0,
  dimensionUnit: DimensionUnit.Cm,
  seoTitle: '',
  seoDescription: '',
};

export const productDashboardFilters = [
  {
    key: 'createdAt',
    label: <FormattedMessage id="products.filters.createdAt.label" />,
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'variants.createdAt',
    description: (
      <FormattedMessage id="products.filters.createdAt.description" />
    ),
  },
  {
    key: 'updatedAt',
    label: <FormattedMessage id="products.filters.updatedAt.label" />,
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'variants.updatedAt',
    description: (
      <FormattedMessage id="products.filters.updatedAt.description" />
    ),
  },
  {
    key: 'status',
    label: <FormattedMessage id="products.filters.status.label" />,
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'status',
    description: <FormattedMessage id="products.filters.status.description" />,
    options: Object.values(entityStatuses),
  },
  {
    key: 'sku',
    label: <FormattedMessage id="products.filters.sku.label" />,
    type: UiFilter.UiFilterType.String,
    operators: UiFilter.uiStringFilterOperators,
    payloadKey: 'variants.sku',
    description: <FormattedMessage id="products.filters.sku.description" />,
  },
  {
    key: 'price',
    label: <FormattedMessage id="products.filters.price.label" />,
    type: UiFilter.UiFilterType.Price,
    operators: UiFilter.uiPriceFilterOperators,
    payloadKey: 'variants.price',
    description: <FormattedMessage id="products.filters.price.description" />,
  },
  {
    key: 'oldPrice',
    label: <FormattedMessage id="products.filters.oldPrice.label" />,
    type: UiFilter.UiFilterType.Price,
    operators: UiFilter.uiPriceFilterOperators,
    payloadKey: 'variants.oldPrice',
    description: (
      <FormattedMessage id="products.filters.oldPrice.description" />
    ),
  },
  {
    key: 'costPrice',
    label: <FormattedMessage id="products.filters.costPrice.label" />,
    type: UiFilter.UiFilterType.Price,
    operators: UiFilter.uiPriceFilterOperators,
    payloadKey: 'variants.costPrice',
    description: (
      <FormattedMessage id="products.filters.costPrice.description" />
    ),
  },
  {
    key: 'stockStatus',
    label: <FormattedMessage id="products.filters.stockStatus.label" />,
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'variants.stockStatus',
    options: Object.values(stockStatuses),
    description: (
      <FormattedMessage id="products.filters.stockStatus.description" />
    ),
  },
  {
    key: 'categories',
    label: <FormattedMessage id="products.filters.categories.label" />,
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'variants.categoryId',
    description: (
      <FormattedMessage id="products.filters.categories.description" />
    ),
    entity: Entity.Category,
  },
  {
    key: 'tags',
    label: <FormattedMessage id="products.filters.tags.label" />,
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'tags.tagId', // fix.
    description: <FormattedMessage id="products.filters.tags.description" />,
    entity: Entity.Tag,
  },
] as UiFilter.IUiFilter[];
