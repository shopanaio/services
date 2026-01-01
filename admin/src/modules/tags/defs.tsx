import { ITagFormValues } from '@modules/tags/types';
import { UiFilter } from '@src/entity/UiFilter';
import { capitalize } from 'lodash';

export enum TagColor {
  Blue = 'BLUE',
  Cyan = 'CYAN',
  Default = 'DEFAULT',
  Geekblue = 'GEEKBLUE',
  Gold = 'GOLD',
  Green = 'GREEN',
  Lime = 'LIME',
  Magenta = 'MAGENTA',
  Orange = 'ORANGE',
  Pink = 'PINK',
  Purple = 'PURPLE',
  Red = 'RED',
  Volcano = 'VOLCANO',
  Yellow = 'YELLOW',
}

export const tagColors = {
  [TagColor.Blue]: '#1890ff',
  [TagColor.Cyan]: '#13c2c2',
  [TagColor.Default]: '#000000',
  [TagColor.Geekblue]: '#2f54eb',
  [TagColor.Gold]: '#faad14',
  [TagColor.Green]: '#52c41a',
  [TagColor.Lime]: '#a0d911',
  [TagColor.Magenta]: '#eb2f96',
  [TagColor.Orange]: '#fa8c16',
  [TagColor.Pink]: '#eb2f96',
  [TagColor.Purple]: '#722ed1',
  [TagColor.Red]: '#f5222d',
  [TagColor.Volcano]: '#fa541c',
  [TagColor.Yellow]: '#faad14',
};

export const tagColumns = {
  title: {
    key: 'title',
    label: 'Title',
    isFixed: true,
    active: true,
    width: 300,
  },
  slug: {
    key: 'slug',
    label: 'Slug',
    isFixed: true,
    width: 200,
    active: false,
  },
  color: {
    key: 'color',
    label: 'Color',
    isFixed: false,
    active: true,
    width: 120,
  },
  createdAt: {
    key: 'createdAt',
    label: 'Created At',
    isFixed: true,
    active: false,
    width: 120,
  },
  updatedAt: {
    key: 'updatedAt',
    label: 'Updated At',
    isFixed: true,
    active: false,
    width: 120,
  },
};

export const defaultFormValues: ITagFormValues = {
  title: '',
  slug: '',
  color: TagColor.Default,
};

export const tagDashboardFilters = [
  {
    key: 'color',
    label: 'Color',
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    description: `Color of a tag`,
    payloadKey: 'color',
    options: Object.values(TagColor).map((it) => ({
      label: capitalize(it.toLocaleLowerCase()),
      value: it,
    })),
  },
] as UiFilter.IUiFilter[];
