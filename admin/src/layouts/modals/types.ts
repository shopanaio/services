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
  // Add your modal types here
  // Example:
  // CONFIRM_DELETE = 'CONFIRM_DELETE',
}
