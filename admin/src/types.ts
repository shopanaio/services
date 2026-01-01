import { ItemType, MenuItemType } from 'antd/es/menu/hooks/useItems';
import { ReactNode } from 'react';

export type MenuItemChildren = MenuItemType & {
  'data-testid'?: string;
};

export type IMenuItemType<T extends MenuItemType = MenuItemType> =
  ItemType<T> & {
    'data-testid'?: string;
    children?: MenuItemChildren[];
    title?: string | ReactNode | null;
  };

export interface IDropdownOption {
  label: ReactNode;
  value: string;
  disabled?: boolean;
}

export interface IMutationHandlers {
  onCompleted?: (data: any) => void;
  onError?: (error: any) => void;
  refetchQueries?: string[];
}
