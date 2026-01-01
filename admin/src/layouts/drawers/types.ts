import { EntityType } from '@src/graphql';

export interface IEntityDrawerItem {
  entityId?: string | number;
  entityType?: EntityType;
  type: DrawerTypes;
  uuid: string;
  defaultValues?: any;
  onSubmit?: (item?: any) => void;
  close?: () => void;
  forceClose?: () => void;
  update?: (nextItem: Partial<IEntityDrawerItem>) => void;
  isDirty?: boolean;
  meta?: any;
}

export enum DrawerTypes {
  BROWSE_TRANSLATION = 'BROWSE_TRANSLATION',
  CATEGORY = 'CATEGORY',
  CUSTOMER = 'CUSTOMER',
  FEATURE_GROUP = 'FEATURE_GROUP',
  MENU = 'MENU',
  ORDER = 'ORDER',
  PAGE = 'PAGE',
  PRODUCT = 'PRODUCT',
  PRODUCT_VARIANT = 'PRODUCT_VARIANT',
  TRANSLATION = 'TRANSLATION',
  REVIEW = 'REVIEW',
}
