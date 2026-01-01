import { EntityType } from '@src/graphql';

export interface IEntityModalItem {
  entityId?: string | number;
  entityType?: EntityType;
  type: ModalTypes;
  uuid: string;
  defaultValues?: any;
  onSubmit?: (item?: any) => void;
  close?: () => void;
  forceClose?: () => void;
  update?: (nextItem: Partial<IEntityModalItem>) => void;
  isDirty?: boolean;
  meta?: any;
}

export enum ModalTypes {
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
