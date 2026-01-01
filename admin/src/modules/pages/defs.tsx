import { IPageFormValues } from '@modules/pages/types';
import { entityStatuses } from '@src/defs/constants';
import { UiFilter } from '@src/entity/UiFilter';
import { EntityStatus } from '@src/graphql';
import { t } from '@src/lang/messages';
import { FormattedMessage } from 'react-intl';

export const pageColumns = {
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
    isFixed: false,
    width: 150,
    active: true,
  },
  slug: {
    key: 'slug',
    label: <FormattedMessage id={t('common.slug')} />,
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

export const defaultFormValues: IPageFormValues = {
  title: '',
  description: null,
  excerpt: null,
  cover: null,
  slug: '',
  status: EntityStatus.Draft,
  gallery: [],
};

export const pageDashboardFilters = [
  {
    key: 'createdAt',
    label: 'Created at',
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'createdAt',
    description: `The date the item was created`,
  },
  {
    key: 'updatedAt',
    label: 'Updated at',
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'updatedAt',
    description: `The date the item was last updated`,
  },
  {
    key: 'status',
    label: 'Status',
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'status',
    description: `Item's status`,
    options: Object.values(entityStatuses),
  },
];
