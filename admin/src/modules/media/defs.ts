import { Entity } from '@src/defs/entities';
import { UiFilter } from '@src/entity/UiFilter';

export const fileColumns = {
  cover: {
    key: 'cover',
    label: 'Cover',
    isSortable: false,
  },
  name: {
    key: 'name',
    label: 'Name',
    isSortable: true,
  },
  size: {
    key: 'size',
    label: 'Size',
    isSortable: true,
  },
  references: {
    key: 'size',
    label: 'Size',
    isSortable: false,
  },
  createdAt: {
    key: 'createdAt',
    label: 'Created At',
    isSortable: true,
  },
};

export const searchOptions = {
  name: fileColumns.name.key,
};

export const fileDashboardFilters = [
  {
    key: 'size',
    label: 'Size',
    type: UiFilter.UiFilterType.Integer,
    operators: UiFilter.uiNumberFilterOperators,
    payloadKey: 'size',
    description: `File size (in bytes)`,
  },
  {
    key: 'createdAt',
    label: 'Created at',
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'variants.createdAt',
    description: `The date the file was add`,
  },
  {
    key: 'product',
    label: 'Product',
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'product',
    description: `Products that use this file`,
    entity: Entity.ProdContainer,
  },
  {
    key: 'category',
    label: 'Category',
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'category',
    description: `Categories that use this file`,
    entity: Entity.Category,
  },
  {
    key: 'post',
    label: 'Post',
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'post',
    description: `posts that use this file`,
    entity: Entity.Post,
  },
  {
    key: 'page',
    label: 'Page',
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'page',
    description: `pages that use this file`,
    entity: Entity.Page,
  },
] as UiFilter.IUiFilter[];
