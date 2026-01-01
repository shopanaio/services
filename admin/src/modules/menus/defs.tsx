import { TreeItems } from '@components/sortableTree/types';
import { entityStatuses } from '@src/defs/constants';
import { IMenuLink } from '@src/entity/Menu/Link';
import { UiFilter } from '@src/entity/UiFilter';
import { EntityStatus, MenuNodeType } from '@src/graphql';
import { t } from '@src/lang/messages';
import { syntheticId } from '@src/utils/synthetic-id';
import { FormattedMessage } from 'react-intl';

export type IMenuFormValues = {
  id: ID;
  menuItems: TreeItems;
  slug: string;
  title: string;
  status: EntityStatus;
};

export const defaultMenuFormValues: IMenuFormValues = {
  id: syntheticId(),
  menuItems: [] as TreeItems,
  slug: '',
  title: '',
  status: EntityStatus.Draft,
};

export type ILinkFormValue = Omit<
  IMenuLink,
  'id' | 'createdAt' | 'updatedAt' | 'type'
> & {
  id: ID | null;
  type: MenuNodeType | null;
  menuId: ID;
  children: any[];
  entry: {
    id: ID;
    title: string;
  } | null;
};

export const menuColumns = {
  title: {
    key: 'title',
    label: <FormattedMessage id="common.title" />,
    isFixed: true,
    active: true,
    width: 300,
  },
  status: {
    key: 'status',
    label: <FormattedMessage id="common.status" />,
    isFixed: true,
    active: true,
    width: 120,
  },
  links: {
    key: 'links',
    label: <FormattedMessage id="translations.links" />,
    isFixed: false,
    active: true,
    width: 200,
  },
  slug: {
    key: 'slug',
    label: <FormattedMessage id="common.slug" />,
    isFixed: true,
    width: 200,
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

export const menuDashboardFilters = [
  {
    key: 'createdAt',
    label: 'Created at',
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'createdAt',
    description: `The date the product was created`,
  },
  {
    key: 'status',
    label: 'Status',
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'status',
    description: `Product's status`,
    options: Object.values(entityStatuses),
  },
  {
    key: 'updatedAt',
    label: 'Updated at',
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'createdAt',
    description: `The date the product was last updated`,
  },
] as UiFilter.IUiFilter[];
