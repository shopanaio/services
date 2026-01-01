import { ICategoryFormValues } from '@modules/categories/types';
import { entityStatuses } from '@src/defs/constants';
import { Entity } from '@src/defs/entities';
import { UiFilter } from '@src/entity/UiFilter';
import { ListingSort, EntityStatus } from '@src/graphql';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const categoryColumns = {
  title: {
    key: 'title',
    label: <FormattedMessage id={t('common.title')} />,
    isFixed: true,
    width: 250,
    active: true,
  },
  status: {
    key: 'status',
    label: <FormattedMessage id={t('common.status')} />,
    isFixed: true,
    width: 150,
    active: true,
  },
  slug: {
    key: 'slug',
    label: <FormattedMessage id={t('category.table.columns.slug')} />,
    isFixed: false,
    width: 200,
    active: false,
  },
  gallery: {
    key: 'gallery',
    label: <FormattedMessage id={t('common.gallery')} />,
    isFixed: false,
    width: 150,
    active: false,
  },
  parent: {
    key: 'parent',
    label: <FormattedMessage id={t('category.table.columns.parent')} />,
    isFixed: false,
    width: 150,
    active: false,
  },
  children: {
    key: 'children',
    label: <FormattedMessage id={t('category.table.columns.children')} />,
    isFixed: false,
    width: 150,
    active: false,
  },

  createdAt: {
    key: 'createdAt',
    label: <FormattedMessage id={t('table.createdAt')} />,
    isFixed: false,
    width: 150,
    active: false,
  },
  updatedAt: {
    key: 'updatedAt',
    label: <FormattedMessage id={t('table.updatedAt')} />,
    isFixed: false,
    width: 150,
    active: false,
  },
};

export const defaultFormValues: ICategoryFormValues = {
  id: null,
  children: [],
  conditions: [],
  conditionsType: '&&',
  title: '',
  description: null,
  excerpt: null,
  seoDescription: null,
  seoTitle: null,
  listingOrderBy: ListingSort.CreatedAtDesc,
  listingOrderByStatus: true,
  parents: [],
  slug: '',
  status: EntityStatus.Draft,
  gallery: [],
  includeChildrenProducts: false,
};

export const categoryDashboardFilters = [
  {
    key: 'createdAt',
    label: (
      <FormattedMessage id={t('category.dashboard.filters.createdAt.label')} />
    ),
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'createdAt',
    description: (
      <FormattedMessage
        id={t('category.dashboard.filters.createdAt.description')}
      />
    ),
  },
  {
    key: 'updatedAt',
    label: (
      <FormattedMessage id={t('category.dashboard.filters.updatedAt.label')} />
    ),
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'createdAt',
    description: (
      <FormattedMessage
        id={t('category.dashboard.filters.updatedAt.description')}
      />
    ),
  },
  {
    key: 'status',
    label: (
      <FormattedMessage id={t('category.dashboard.filters.status.label')} />
    ),
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'status',
    description: (
      <FormattedMessage
        id={t('category.dashboard.filters.status.description')}
      />
    ),
    options: Object.values(entityStatuses),
  },

  {
    key: 'children',
    label: (
      <FormattedMessage id={t('category.dashboard.filters.children.label')} />
    ),
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'children.id',
    description: (
      <FormattedMessage
        id={t('category.dashboard.filters.children.description')}
      />
    ),
    entity: Entity.Category,
  },
  {
    key: 'parent',
    label: (
      <FormattedMessage id={t('category.dashboard.filters.parent.label')} />
    ),
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'parent.id',
    description: (
      <FormattedMessage
        id={t('category.dashboard.filters.parent.description')}
      />
    ),
    entity: Entity.Category,
  },
] as UiFilter.IUiFilter[];
